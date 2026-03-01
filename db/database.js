/**
 * CeramicDB — Excel-backed SQLite Database Layer
 * Uses sql.js (in-memory SQLite) as the query engine.
 * Persists data to an Excel file (CeramicDB-Database.xlsx) after writes.
 */
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const DB_PATH = path.join(__dirname, 'ceramicdb.sqlite');
const EXCEL_DIR = path.join(__dirname, '..', 'data');
const EXCEL_PATH = path.join(EXCEL_DIR, 'CeramicDB-Database.xlsx');

// Tables to sync to Excel (table name → sheet name)
const SYNC_TABLES = {
    users: 'Users',
    projects: 'Projects',
    samples: 'Samples',
    analyses: 'Analyses',
    elemental_data: 'Elemental Data',
    fabric_groups: 'Fabric Groups',
    petrographic_observations: 'Petrography',
    microphotographs: 'Microphotographs'
};

// ===================================================================
//  SQLite Wrapper with Excel Sync
// ===================================================================
class SqliteWrapper {
    constructor(sqlDb) {
        this._db = sqlDb;
        this._saveTimer = null;
        this._excelTimer = null;
    }

    prepare(sql) {
        const db = this._db;
        const wrapper = this;
        return {
            run(...params) {
                db.run(sql, params);
                wrapper._scheduleSave();
                const lastId = db.exec("SELECT last_insert_rowid()")[0]?.values[0][0];
                const changes = db.getRowsModified();
                return { lastInsertRowid: lastId, changes };
            },
            get(...params) {
                const stmt = db.prepare(sql);
                stmt.bind(params);
                const result = stmt.step() ? stmt.getAsObject() : undefined;
                stmt.free();
                return result;
            },
            all(...params) {
                const stmt = db.prepare(sql);
                stmt.bind(params);
                const results = [];
                while (stmt.step()) results.push(stmt.getAsObject());
                stmt.free();
                return results;
            }
        };
    }

    exec(sql) { this._db.run(sql); this._scheduleSave(); }
    pragma(str) { try { this._db.run(`PRAGMA ${str}`); } catch (e) { } }

    transaction(fn) {
        const self = this;
        return function (...args) {
            self._db.run("BEGIN");
            try {
                const result = fn(...args);
                self._db.run("COMMIT");
                self._scheduleSave();
                return result;
            } catch (e) { self._db.run("ROLLBACK"); throw e; }
        };
    }

    _scheduleSave() {
        // Save SQLite to disk
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => this.save(), 500);

        // Save to Excel (debounced longer to batch writes)
        if (this._excelTimer) clearTimeout(this._excelTimer);
        this._excelTimer = setTimeout(() => this.saveToExcel(), 2000);
    }

    save() {
        try {
            const data = this._db.export();
            fs.writeFileSync(DB_PATH, Buffer.from(data));
        } catch (e) { console.error('Error saving SQLite:', e.message); }
    }

    // ── Excel sync ──────────────────────────────────────

    saveToExcel() {
        try {
            if (!fs.existsSync(EXCEL_DIR)) fs.mkdirSync(EXCEL_DIR, { recursive: true });

            const wb = XLSX.utils.book_new();

            for (const [table, sheetName] of Object.entries(SYNC_TABLES)) {
                try {
                    const rows = this._db.exec(`SELECT * FROM ${table}`);
                    if (rows.length > 0) {
                        const data = rows[0].values.map(row => {
                            const obj = {};
                            rows[0].columns.forEach((col, i) => obj[col] = row[i]);
                            return obj;
                        });
                        const ws = XLSX.utils.json_to_sheet(data);
                        ws['!cols'] = rows[0].columns.map(c => ({ wch: Math.max(c.length + 2, 12) }));
                        XLSX.utils.book_append_sheet(wb, ws, sheetName);
                    } else {
                        // Empty table — write headers only
                        const ws = XLSX.utils.aoa_to_sheet([]);
                        XLSX.utils.book_append_sheet(wb, ws, sheetName);
                    }
                } catch (e) {
                    // Table might not exist yet during init
                }
            }

            // Metadata sheet
            const meta = [
                { Key: 'Last Saved', Value: new Date().toISOString() },
                { Key: 'Application', Value: 'CeramicDB v1.0' }
            ];
            const metaWs = XLSX.utils.json_to_sheet(meta);
            XLSX.utils.book_append_sheet(wb, metaWs, 'Info');

            XLSX.writeFile(wb, EXCEL_PATH);
            console.log(`📊 Excel synced: ${EXCEL_PATH}`);
        } catch (e) {
            console.error('Excel sync error:', e.message);
        }
    }

    loadFromExcel() {
        if (!fs.existsSync(EXCEL_PATH)) return false;

        try {
            console.log('📖 Loading data from Excel...');
            const wb = XLSX.readFile(EXCEL_PATH);

            // Reverse map: sheet name → table name
            const sheetToTable = {};
            for (const [table, sheet] of Object.entries(SYNC_TABLES)) {
                sheetToTable[sheet] = table;
            }

            for (const sheetName of wb.SheetNames) {
                const tableName = sheetToTable[sheetName];
                if (!tableName) continue;

                const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });
                if (rows.length === 0) continue;

                // Clear existing data
                try { this._db.run(`DELETE FROM ${tableName}`); } catch (e) { continue; }

                // Insert rows
                const columns = Object.keys(rows[0]);
                const placeholders = columns.map(() => '?').join(',');
                const insertSql = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES (${placeholders})`;

                for (const row of rows) {
                    try {
                        const values = columns.map(c => row[c] === undefined ? null : row[c]);
                        this._db.run(insertSql, values);
                    } catch (e) {
                        // Skip rows that fail (e.g., constraint violations)
                    }
                }

                console.log(`  📋 ${sheetName}: ${rows.length} rows loaded`);
            }

            console.log('✅ Data loaded from Excel successfully');
            return true;
        } catch (e) {
            console.error('Excel load error:', e.message);
            return false;
        }
    }

    close() {
        if (this._saveTimer) { clearTimeout(this._saveTimer); this.save(); }
        if (this._excelTimer) { clearTimeout(this._excelTimer); this.saveToExcel(); }
        this._db.close();
    }
}

// ===================================================================
//  Factory: create the database
// ===================================================================
async function createDatabase() {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    let sqlDb;

    if (fs.existsSync(DB_PATH)) {
        const buffer = fs.readFileSync(DB_PATH);
        sqlDb = new SQL.Database(buffer);
    } else {
        sqlDb = new SQL.Database();
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        sqlDb.run(schema);
    }
    console.log('📦 Using SQLite (sql.js) + Excel sync');
    return new SqliteWrapper(sqlDb);
}

module.exports = { createDatabase, DB_PATH, EXCEL_PATH };
