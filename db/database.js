/**
 * CeramicDB — Unified Async Database Layer
 * Supports both sql.js (local dev) and PostgreSQL (production).
 * Chosen based on DATABASE_URL env var.
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ceramicdb.sqlite');

// --- SQL placeholder conversion ---
function sqliteToPostgres(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
}

// ===================================================================
//  SQLite Wrapper (sql.js) — for local development
// ===================================================================
class SqliteWrapper {
    constructor(sqlDb) {
        this._db = sqlDb;
        this._saveTimer = null;
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
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => this.save(), 500);
    }

    save() {
        try {
            const data = this._db.export();
            fs.writeFileSync(DB_PATH, Buffer.from(data));
        } catch (e) { console.error('Error saving database:', e.message); }
    }

    close() {
        if (this._saveTimer) { clearTimeout(this._saveTimer); this.save(); }
        this._db.close();
    }
}

// ===================================================================
//  PostgreSQL Wrapper — for production (Render, etc.)
// ===================================================================
class PgWrapper {
    constructor(pool) {
        this.pool = pool;
    }

    prepare(sql) {
        const pgSql = sqliteToPostgres(sql);
        const pool = this.pool;
        return {
            async run(...params) {
                // Handle RETURNING id for INSERTs
                let finalSql = pgSql;
                if (/^\s*INSERT\s+INTO/i.test(finalSql) && !/RETURNING/i.test(finalSql)) {
                    finalSql = finalSql.replace(/;\s*$/, '') + ' RETURNING id';
                }
                const result = await pool.query(finalSql, params);
                return {
                    lastInsertRowid: result.rows[0]?.id,
                    changes: result.rowCount
                };
            },
            async get(...params) {
                const result = await pool.query(pgSql, params);
                return result.rows[0];
            },
            async all(...params) {
                const result = await pool.query(pgSql, params);
                return result.rows;
            }
        };
    }

    async exec(sql) {
        await this.pool.query(sql);
    }

    pragma() { /* no-op for PostgreSQL */ }

    transaction(fn) {
        const pool = this.pool;
        return async function (...args) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const result = await fn(...args);
                await client.query('COMMIT');
                return result;
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        };
    }

    async close() {
        await this.pool.end();
    }
}

// ===================================================================
//  Factory: create the right wrapper based on environment
// ===================================================================
async function createDatabase() {
    if (process.env.DATABASE_URL) {
        // PostgreSQL mode
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        });
        console.log('🐘 Connected to PostgreSQL');
        return new PgWrapper(pool);
    } else {
        // SQLite mode (local development)
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
        console.log('📦 Using SQLite (sql.js)');
        return new SqliteWrapper(sqlDb);
    }
}

module.exports = { createDatabase, DB_PATH };
