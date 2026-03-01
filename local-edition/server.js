/**
 * CeramicDB Local Edition — Server
 * Uses an Excel file as the database backend.
 */
const express = require('express');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 4000;
const DATA_FILE = path.join(__dirname, 'data', 'CeramicDB-Database.xlsx');

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── In-memory data store ────────────────────────────────
let db = { samples: [], analyses: [], fabricGroups: [], projects: [] };
let lastSync = null;
let dirty = false;

// ── Column definitions (header names for each sheet) ────
const SAMPLE_COLS = [
    'ID', 'Sample Code', 'Project', 'Site', 'Site Code', 'Context', 'Stratigraphy',
    'Trench', 'Locus', 'Period', 'Chronology', 'Type', 'Form', 'Part',
    'Decoration', 'Surface Treatment', 'Color', 'Munsell', 'Firing', 'Hardness',
    'Thickness (mm)', 'Weight (g)', 'Fabric Group', 'Condition', 'Notes'
];
const ANALYSIS_COLS = [
    'ID', 'Sample Code', 'Method', 'Laboratory', 'Analyst', 'Date',
    'SiO2', 'Al2O3', 'Fe2O3', 'CaO', 'MgO', 'Na2O', 'K2O', 'TiO2', 'P2O5', 'MnO',
    'Cr', 'Ni', 'V', 'Co', 'Zn', 'Rb', 'Sr', 'Zr', 'Ba', 'La', 'Ce', 'Nd',
    'Sc', 'Y', 'Nb', 'Th', 'U', 'Pb', 'Cu'
];
const FABRIC_COLS = ['ID', 'Name', 'Code', 'Description', 'Inclusions', 'Color Range', 'Firing Range', 'Region'];
const PROJECT_COLS = ['ID', 'Name', 'Description', 'PI', 'University', 'Status', 'Start Date', 'End Date'];

// ── Load Excel into memory ──────────────────────────────
function loadFromExcel() {
    if (!fs.existsSync(DATA_FILE)) {
        createDefaultExcel();
    }

    try {
        const wb = XLSX.readFile(DATA_FILE);

        db.samples = readSheet(wb, 'Samples', SAMPLE_COLS);
        db.analyses = readSheet(wb, 'Analyses', ANALYSIS_COLS);
        db.fabricGroups = readSheet(wb, 'Fabric Groups', FABRIC_COLS);
        db.projects = readSheet(wb, 'Projects', PROJECT_COLS);

        lastSync = new Date().toISOString();
        dirty = false;
        console.log(`📖 Loaded: ${db.samples.length} samples, ${db.analyses.length} analyses, ${db.fabricGroups.length} fabric groups, ${db.projects.length} projects`);
    } catch (e) {
        console.error('❌ Failed to read Excel:', e.message);
        throw e;
    }
}

function readSheet(wb, sheetName, expectedCols) {
    if (!wb.SheetNames.includes(sheetName)) return [];
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
    // Assign sequential IDs if not present
    return rows.map((r, i) => {
        r.ID = r.ID || i + 1;
        return r;
    });
}

// ── Save memory to Excel ────────────────────────────────
function saveToExcel() {
    const wb = XLSX.utils.book_new();

    appendSheet(wb, 'Samples', db.samples, SAMPLE_COLS);
    appendSheet(wb, 'Analyses', db.analyses, ANALYSIS_COLS);
    appendSheet(wb, 'Fabric Groups', db.fabricGroups, FABRIC_COLS);
    appendSheet(wb, 'Projects', db.projects, PROJECT_COLS);

    // Add metadata sheet
    const metaData = [
        { Key: 'Last Saved', Value: new Date().toISOString() },
        { Key: 'Total Samples', Value: db.samples.length },
        { Key: 'Total Analyses', Value: db.analyses.length },
        { Key: 'Total Fabric Groups', Value: db.fabricGroups.length },
        { Key: 'Total Projects', Value: db.projects.length },
        { Key: 'Application', Value: 'CeramicDB Local Edition v1.0' }
    ];
    const metaSheet = XLSX.utils.json_to_sheet(metaData);
    metaSheet['!cols'] = [{ wch: 20 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, metaSheet, 'Info');

    // Ensure data directory exists
    const dataDir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    XLSX.writeFile(wb, DATA_FILE);
    lastSync = new Date().toISOString();
    dirty = false;
    console.log(`💾 Saved to Excel: ${DATA_FILE}`);
}

function appendSheet(wb, name, data, cols) {
    const ws = XLSX.utils.json_to_sheet(data, { header: cols });
    // Set column widths
    ws['!cols'] = cols.map(c => ({ wch: Math.max(c.length + 2, 14) }));
    XLSX.utils.book_append_sheet(wb, ws, name);
}

// ── Create default Excel with seed data ─────────────────
function createDefaultExcel() {
    console.log('📝 Creating default database file...');
    db.projects = [
        { ID: 1, Name: 'Aegean Bronze Age Ceramics', Description: 'Study of Bronze Age pottery from Aegean sites', PI: 'Dr. Maria Georgiou', University: 'University of Cyprus', Status: 'Active', 'Start Date': '2025-01-15', 'End Date': '' },
        { ID: 2, Name: 'Cyprus LBA Provenance', Description: 'Provenance study of Late Bronze Age Cypriot pottery', PI: 'Dr. Vasiliki Kassianidou', University: 'University of Cyprus', Status: 'Active', 'Start Date': '2025-03-01', 'End Date': '' },
        { ID: 3, Name: 'Paphos District Survey', Description: 'Systematic survey of Paphos district ceramic assemblages', PI: 'Dr. Artemis Christou', University: 'University of Athens', Status: 'Planning', 'Start Date': '2025-06-01', 'End Date': '' }
    ];
    db.fabricGroups = [
        { ID: 1, Name: 'Troodos Ophiolite Igneous', Code: 'TOI', Description: 'Igneous-derived fabrics from the Troodos ophiolite complex', Inclusions: 'Pyroxene, olivine, serpentine, chromite', 'Color Range': 'Dark grey to greenish', 'Firing Range': '800–950°C', Region: 'Cyprus — Troodos' },
        { ID: 2, Name: 'Troodos Pillow Lava', Code: 'TPL', Description: 'Basaltic fabrics from Troodos pillow lavas', Inclusions: 'Augite, plagioclase laths, volcanic glass', 'Color Range': 'Dark reddish brown', 'Firing Range': '750–900°C', Region: 'Cyprus — Troodos' },
        { ID: 3, Name: 'Sedimentary Circum-Troodos', Code: 'SCT', Description: 'Calcareous/marl-derived fabrics from sedimentary zones', Inclusions: 'Calcite, foraminifera, quartz silt', 'Color Range': 'Cream to pale brown', 'Firing Range': '700–850°C', Region: 'Cyprus — Mesaoria' },
        { ID: 4, Name: 'Mammonia Mélange', Code: 'MAM', Description: 'Mixed lithology from Mammonia Complex', Inclusions: 'Chert, sandstone, mudstone, radiolarite', 'Color Range': 'Brown to reddish', 'Firing Range': '800–950°C', Region: 'Cyprus — Mammonia' },
        { ID: 5, Name: 'Kyrenia Range Carbonate', Code: 'KRC', Description: 'Limestone and dolostone fabrics from northern range', Inclusions: 'Calcite, dolomite, bioclasts', 'Color Range': 'White to pale yellow', 'Firing Range': '700–800°C', Region: 'Cyprus — Kyrenia' },
        { ID: 6, Name: 'Eastern Mesaoria Alluvial', Code: 'EMA', Description: 'Mixed alluvial fabrics from eastern coastal plains', Inclusions: 'Quartz, feldspar, mica, clay pellets', 'Color Range': 'Buff to orange', 'Firing Range': '750–900°C', Region: 'Cyprus — East Coast' },
        { ID: 7, Name: 'Aegean Fine Ware', Code: 'AFW', Description: 'Fine-grained fabric typical of Aegean pottery', Inclusions: 'Fine quartz, mica, feldspar', 'Color Range': 'Buff to pinkish', 'Firing Range': '900–1050°C', Region: 'Aegean' },
        { ID: 8, Name: 'Aegean Coarse Ware', Code: 'ACW', Description: 'Coarse fabric with volcanic inclusions', Inclusions: 'Pumice, quartz, feldspar, rock fragments', 'Color Range': 'Grey to brown', 'Firing Range': '800–950°C', Region: 'Aegean' }
    ];
    db.samples = [
        { ID: 1, 'Sample Code': 'CYP-001', Project: 'Cyprus LBA Provenance', Site: 'Enkomi', 'Site Code': 'ENK', Context: 'Area III', Stratigraphy: 'Floor 2', Trench: '', Locus: '', Period: 'Late Bronze Age', Chronology: 'LC IIC', Type: 'Cooking pot', Form: 'Pot', Part: 'Rim', Decoration: '', 'Surface Treatment': '', Color: 'Reddish brown', Munsell: '5YR 5/4', Firing: 'Oxidised', Hardness: 'Hard', 'Thickness (mm)': 8.2, 'Weight (g)': 45.3, 'Fabric Group': 'TOI', Condition: 'Good', Notes: '' },
        { ID: 2, 'Sample Code': 'CYP-002', Project: 'Cyprus LBA Provenance', Site: 'Enkomi', 'Site Code': 'ENK', Context: 'Tomb 18', Stratigraphy: '', Trench: '', Locus: '', Period: 'Late Bronze Age', Chronology: 'LC IIIA', Type: 'Fine ware', Form: 'Bowl', Part: 'Complete profile', Decoration: 'Painted', 'Surface Treatment': 'Burnished', Color: 'Buff', Munsell: '10YR 7/4', Firing: 'Oxidised', Hardness: 'Medium', 'Thickness (mm)': 5.1, 'Weight (g)': 28.7, 'Fabric Group': 'SCT', Condition: 'Good', Notes: '' },
        { ID: 3, 'Sample Code': 'CYP-003', Project: 'Cyprus LBA Provenance', Site: 'Hala Sultan Tekke', 'Site Code': 'HST', Context: 'Area 6W', Stratigraphy: 'Stratum 3', Trench: '', Locus: '', Period: 'Late Bronze Age', Chronology: 'LC IIC', Type: 'Transport jar', Form: 'Amphora', Part: 'Handle', Decoration: '', 'Surface Treatment': '', Color: 'Brown', Munsell: '7.5YR 5/6', Firing: 'Oxidised', Hardness: 'Hard', 'Thickness (mm)': 12.4, 'Weight (g)': 89.2, 'Fabric Group': 'MAM', Condition: 'Fair', Notes: 'Canaanite-type jar' },
        { ID: 4, 'Sample Code': 'CYP-004', Project: 'Cyprus LBA Provenance', Site: 'Hala Sultan Tekke', 'Site Code': 'HST', Context: 'Area 6W', Stratigraphy: 'Floor 1', Trench: '', Locus: '', Period: 'Late Bronze Age', Chronology: 'LC IIC-IIIA', Type: 'Fine ware', Form: 'Krater', Part: 'Body sherd', Decoration: 'Pictorial', 'Surface Treatment': 'Slipped', Color: 'Cream', Munsell: '10YR 8/3', Firing: 'Oxidised', Hardness: 'Medium', 'Thickness (mm)': 6.8, 'Weight (g)': 34.5, 'Fabric Group': 'AFW', Condition: 'Good', Notes: 'Possible Mycenaean import' },
        { ID: 5, 'Sample Code': 'PAP-001', Project: 'Paphos District Survey', Site: 'Palaepaphos', 'Site Code': 'PPH', Context: 'Field survey', Stratigraphy: '', Trench: '', Locus: '', Period: 'Iron Age', Chronology: 'CG I-II', Type: 'Coarse ware', Form: 'Pithos', Part: 'Body sherd', Decoration: 'Rope pattern', 'Surface Treatment': '', Color: 'Orange', Munsell: '5YR 6/6', Firing: 'Oxidised', Hardness: 'Hard', 'Thickness (mm)': 15.3, 'Weight (g)': 125.0, 'Fabric Group': 'EMA', Condition: 'Worn', Notes: '' },
        { ID: 6, 'Sample Code': 'ABE-001', Project: 'Aegean Bronze Age Ceramics', Site: 'Akrotiri', 'Site Code': 'AKR', Context: 'Sector Beta', Stratigraphy: 'Destruction level', Trench: '', Locus: '', Period: 'Late Bronze Age', Chronology: 'LC I', Type: 'Cooking pot', Form: 'Tripod', Part: 'Leg', Decoration: '', 'Surface Treatment': '', Color: 'Dark grey', Munsell: '10YR 4/1', Firing: 'Reduced', Hardness: 'Hard', 'Thickness (mm)': 9.5, 'Weight (g)': 67.8, 'Fabric Group': 'ACW', Condition: 'Good', Notes: '' }
    ];
    db.analyses = [
        { ID: 1, 'Sample Code': 'CYP-001', Method: 'pXRF', Laboratory: 'STARC Cyprus', Analyst: 'Dr. Georgiou', Date: '2025-08-20', SiO2: 44.8, Al2O3: 14.2, Fe2O3: 12.5, CaO: 6.8, MgO: 9.1, Na2O: 1.8, K2O: 0.9, TiO2: 1.6, P2O5: 0.18, MnO: 0.18, Cr: 580, Ni: 320, V: 245, Co: 52, Zn: 88, Rb: 18, Sr: 195, Zr: 78, Ba: 145, La: '', Ce: '', Nd: '', Sc: '', Y: '', Nb: '', Th: '', U: '', Pb: '', Cu: '' },
        { ID: 2, 'Sample Code': 'CYP-002', Method: 'XRF', Laboratory: 'STARC Cyprus', Analyst: 'Dr. Georgiou', Date: '2025-08-22', SiO2: 38.5, Al2O3: 10.8, Fe2O3: 5.2, CaO: 22.4, MgO: 3.6, Na2O: 0.9, K2O: 1.8, TiO2: 0.65, P2O5: 0.22, MnO: 0.08, Cr: 45, Ni: 28, V: 68, Co: 12, Zn: 55, Rb: 65, Sr: 480, Zr: 95, Ba: 220, La: '', Ce: '', Nd: '', Sc: '', Y: '', Nb: '', Th: '', U: '', Pb: '', Cu: '' },
        { ID: 3, 'Sample Code': 'CYP-003', Method: 'ICP-MS', Laboratory: 'Univ. Athens', Analyst: 'Dr. Papadopoulos', Date: '2025-09-10', SiO2: 52.1, Al2O3: 15.8, Fe2O3: 7.9, CaO: 5.4, MgO: 4.2, Na2O: 2.1, K2O: 2.8, TiO2: 0.88, P2O5: 0.15, MnO: 0.12, Cr: 125, Ni: 65, V: 135, Co: 22, Zn: 95, Rb: 85, Sr: 285, Zr: 145, Ba: 380, La: 28, Ce: 58, Nd: 24, Sc: 18, Y: 22, Nb: 8, Th: 6.5, U: 1.8, Pb: 18, Cu: 35 },
        { ID: 4, 'Sample Code': 'ABE-001', Method: 'XRF', Laboratory: 'Demokritos NCSR', Analyst: 'Dr. Kilikoglou', Date: '2025-07-15', SiO2: 55.2, Al2O3: 16.8, Fe2O3: 8.4, CaO: 4.2, MgO: 3.8, Na2O: 3.2, K2O: 2.5, TiO2: 1.1, P2O5: 0.25, MnO: 0.15, Cr: 95, Ni: 48, V: 165, Co: 28, Zn: 110, Rb: 72, Sr: 320, Zr: 180, Ba: 420, La: '', Ce: '', Nd: '', Sc: '', Y: '', Nb: '', Th: '', U: '', Pb: '', Cu: '' }
    ];
    saveToExcel();
}

// ── API Routes ──────────────────────────────────────────

// GET: all data for a sheet
app.get('/api/data/:sheet', (req, res) => {
    const sheet = req.params.sheet;
    const map = { samples: db.samples, analyses: db.analyses, 'fabric-groups': db.fabricGroups, projects: db.projects };
    if (!map[sheet]) return res.status(400).json({ error: 'Invalid sheet' });
    res.json({ data: map[sheet], lastSync, dirty });
});

// GET: column definitions
app.get('/api/columns/:sheet', (req, res) => {
    const map = { samples: SAMPLE_COLS, analyses: ANALYSIS_COLS, 'fabric-groups': FABRIC_COLS, projects: PROJECT_COLS };
    if (!map[req.params.sheet]) return res.status(400).json({ error: 'Invalid sheet' });
    res.json({ columns: map[req.params.sheet] });
});

// POST: add a row
app.post('/api/data/:sheet', (req, res) => {
    const sheet = req.params.sheet;
    const map = { samples: db.samples, analyses: db.analyses, 'fabric-groups': db.fabricGroups, projects: db.projects };
    if (!map[sheet]) return res.status(400).json({ error: 'Invalid sheet' });

    const data = map[sheet];
    const maxId = data.reduce((max, r) => Math.max(max, r.ID || 0), 0);
    const row = { ID: maxId + 1, ...req.body };
    data.push(row);
    dirty = true;
    res.json({ row, dirty: true });
});

// PUT: update a row
app.put('/api/data/:sheet/:id', (req, res) => {
    const sheet = req.params.sheet;
    const id = parseInt(req.params.id);
    const map = { samples: db.samples, analyses: db.analyses, 'fabric-groups': db.fabricGroups, projects: db.projects };
    if (!map[sheet]) return res.status(400).json({ error: 'Invalid sheet' });

    const data = map[sheet];
    const idx = data.findIndex(r => r.ID === id);
    if (idx === -1) return res.status(404).json({ error: 'Row not found' });

    data[idx] = { ...data[idx], ...req.body, ID: id };
    dirty = true;
    res.json({ row: data[idx], dirty: true });
});

// DELETE: remove a row
app.delete('/api/data/:sheet/:id', (req, res) => {
    const sheet = req.params.sheet;
    const id = parseInt(req.params.id);
    const map = { samples: db.samples, analyses: db.analyses, 'fabric-groups': db.fabricGroups, projects: db.projects };
    if (!map[sheet]) return res.status(400).json({ error: 'Invalid sheet' });

    const data = map[sheet];
    const idx = data.findIndex(r => r.ID === id);
    if (idx === -1) return res.status(404).json({ error: 'Row not found' });

    data.splice(idx, 1);
    dirty = true;
    res.json({ success: true, dirty: true });
});

// POST: sync — save to Excel
app.post('/api/sync', (req, res) => {
    try {
        saveToExcel();
        res.json({ success: true, lastSync, message: 'Data saved to Excel successfully' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to save: ' + e.message });
    }
});

// POST: reload — reload from Excel
app.post('/api/reload', (req, res) => {
    try {
        loadFromExcel();
        res.json({ success: true, lastSync, message: 'Data reloaded from Excel' });
    } catch (e) {
        res.status(500).json({ error: 'Failed to reload: ' + e.message });
    }
});

// GET: summary stats
app.get('/api/stats', (req, res) => {
    res.json({
        samples: db.samples.length,
        analyses: db.analyses.length,
        fabricGroups: db.fabricGroups.length,
        projects: db.projects.length,
        lastSync,
        dirty,
        file: DATA_FILE
    });
});

// SPA fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// ── Start ───────────────────────────────────────────────
loadFromExcel();
app.listen(PORT, () => {
    console.log(`\n🏺 CeramicDB Local Edition running at http://localhost:${PORT}`);
    console.log(`📂 Database file: ${DATA_FILE}\n`);
});
