const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const router = express.Router();

function requireAuth(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
    next();
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ===================== TEMPLATES =====================

function buildSamplesTemplate() {
    const headers = [
        'sample_code*', 'project_id', 'site_name', 'site_code', 'excavation_context',
        'stratigraphic_unit', 'trench', 'locus', 'period', 'chronology', 'dating_method',
        'ceramic_type', 'vessel_form', 'vessel_part', 'decoration', 'surface_treatment',
        'color', 'munsell_code', 'firing', 'hardness', 'thickness_mm', 'weight_g',
        'length_mm', 'width_mm', 'rim_diameter_mm', 'base_diameter_mm',
        'condition', 'completeness', 'latitude', 'longitude', 'elevation',
        'collected_by', 'collection_date', 'current_location', 'description', 'notes'
    ];
    const example = [
        'CYP-NEW-001', '', 'Enkomi', 'ENK', 'Area III', 'Floor 2', '', '', 'Late Bronze Age',
        'LC IIC (c. 1300 BCE)', '', 'Fine ware', 'Bowl', 'Rim sherd', '', '', 'Buff',
        '10YR 7/4', '', '', '6.5', '25.3', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 18 }));
    return ws;
}

function buildAnalysesTemplate() {
    const headers = [
        'sample_code*', 'method*', 'laboratory', 'analyst', 'analysis_date',
        'SiO2', 'Al2O3', 'Fe2O3', 'CaO', 'MgO', 'Na2O', 'K2O', 'TiO2', 'P2O5', 'MnO',
        'Cr', 'Ni', 'V', 'Co', 'Zn', 'Rb', 'Sr', 'Zr', 'Ba', 'La', 'Ce', 'Nd', 'Sc',
        'Y', 'Nb', 'Th', 'U', 'Pb', 'Cu'
    ];
    const example = [
        'CYP-001', 'XRF', 'STARC Cyprus', 'Dr. Elena Georgiou', '2025-08-20',
        '44.8', '14.2', '12.5', '6.8', '9.1', '1.8', '0.9', '1.6', '0.18', '0.18',
        '580', '320', '245', '52', '88', '18', '195', '78', '145', '', '', '', '',
        '', '', '', '', '', ''
    ];
    const notes = [
        '(required)', '(XRF/pXRF/ICP-MS/ICP-OES/LA-ICP-MS/NAA/SEM-EDS/PIXE/Other)', '', '', '(YYYY-MM-DD)',
        'wt%', 'wt%', 'wt%', 'wt%', 'wt%', 'wt%', 'wt%', 'wt%', 'wt%', 'wt%',
        'ppm', 'ppm', 'ppm', 'ppm', 'ppm', 'ppm', 'ppm', 'ppm', 'ppm', 'ppm', 'ppm', 'ppm', 'ppm',
        'ppm', 'ppm', 'ppm', 'ppm', 'ppm', 'ppm'
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, notes, example]);
    ws['!cols'] = headers.map(() => ({ wch: 14 }));
    return ws;
}

function buildFabricGroupsTemplate() {
    const headers = ['name*', 'code*', 'description', 'key_characteristics', 'typical_inclusions', 'color_range', 'firing_range', 'region'];
    const example = ['My Fabric Group', 'MFG', 'Description of the fabric', 'Key features', 'Quartz, feldspar, mica', 'Brown to red', '800-1000°C', 'Cyprus — Troodos'];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws['!cols'] = headers.map(() => ({ wch: 22 }));
    return ws;
}

// GET /api/import-export/template/:type
router.get('/template/:type', requireAuth, (req, res) => {
    const { type } = req.params;
    const wb = XLSX.utils.book_new();

    if (type === 'samples') {
        XLSX.utils.book_append_sheet(wb, buildSamplesTemplate(), 'Samples');
    } else if (type === 'analyses') {
        XLSX.utils.book_append_sheet(wb, buildAnalysesTemplate(), 'Analyses');
    } else if (type === 'fabric-groups') {
        XLSX.utils.book_append_sheet(wb, buildFabricGroupsTemplate(), 'Fabric Groups');
    } else if (type === 'all') {
        XLSX.utils.book_append_sheet(wb, buildSamplesTemplate(), 'Samples');
        XLSX.utils.book_append_sheet(wb, buildAnalysesTemplate(), 'Analyses');
        XLSX.utils.book_append_sheet(wb, buildFabricGroupsTemplate(), 'Fabric Groups');
    } else {
        return res.status(400).json({ error: 'Invalid template type. Use: samples, analyses, fabric-groups, or all' });
    }

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=ceramicdb-template-${type}.xlsx`);
    res.send(buffer);
});

// ===================== IMPORT =====================

// POST /api/import-export/upload
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Excel file is required' });

        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const db = req.app.locals.db;
        const userId = req.session.userId;
        const results = { samples: 0, analyses: 0, fabricGroups: 0, errors: [] };

        // Process Samples sheet
        if (wb.SheetNames.includes('Samples')) {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets['Samples']);
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                const code = r['sample_code*'] || r['sample_code'];
                if (!code) { results.errors.push(`Samples row ${i + 2}: missing sample_code`); continue; }

                const existing = await db.prepare('SELECT id FROM samples WHERE sample_code = ?').get(code);
                if (existing) { results.errors.push(`Samples row ${i + 2}: sample '${code}' already exists, skipped`); continue; }

                try {
                    await db.prepare(`
                        INSERT INTO samples (sample_code, project_id, site_name, site_code, excavation_context,
                            stratigraphic_unit, trench, locus, period, chronology, dating_method,
                            ceramic_type, vessel_form, vessel_part, decoration, surface_treatment,
                            color, munsell_code, firing, hardness, thickness_mm, weight_g,
                            length_mm, width_mm, rim_diameter_mm, base_diameter_mm,
                            condition, completeness, latitude, longitude, elevation,
                            collected_by, collection_date, current_location, description, notes, created_by)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    `).run(
                        code, r.project_id || null, r.site_name, r.site_code, r.excavation_context,
                        r.stratigraphic_unit, r.trench, r.locus, r.period, r.chronology, r.dating_method,
                        r.ceramic_type, r.vessel_form, r.vessel_part, r.decoration, r.surface_treatment,
                        r.color, r.munsell_code, r.firing, r.hardness,
                        r.thickness_mm || null, r.weight_g || null,
                        r.length_mm || null, r.width_mm || null, r.rim_diameter_mm || null, r.base_diameter_mm || null,
                        r.condition, r.completeness, r.latitude || null, r.longitude || null, r.elevation || null,
                        r.collected_by, r.collection_date, r.current_location, r.description, r.notes, userId
                    );
                    results.samples++;
                } catch (e) { results.errors.push(`Samples row ${i + 2}: ${e.message}`); }
            }
        }

        // Process Analyses sheet
        if (wb.SheetNames.includes('Analyses')) {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets['Analyses']);
            const majorOxides = ['SiO2', 'Al2O3', 'Fe2O3', 'CaO', 'MgO', 'Na2O', 'K2O', 'TiO2', 'P2O5', 'MnO'];
            const traceElements = ['Cr', 'Ni', 'V', 'Co', 'Zn', 'Rb', 'Sr', 'Zr', 'Ba', 'La', 'Ce', 'Nd', 'Sc', 'Y', 'Nb', 'Th', 'U', 'Pb', 'Cu'];

            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                // Skip the notes/units row
                const code = r['sample_code*'] || r['sample_code'];
                const method = r['method*'] || r['method'];
                if (!code || !method || code === '(required)') continue;

                const sample = await db.prepare('SELECT id FROM samples WHERE sample_code = ?').get(code);
                if (!sample) { results.errors.push(`Analyses row ${i + 2}: sample '${code}' not found`); continue; }

                try {
                    const aResult = await db.prepare(
                        'INSERT INTO analyses (sample_id, method, laboratory, analyst, analysis_date, created_by) VALUES (?,?,?,?,?,?)'
                    ).run(sample.id, method, r.laboratory, r.analyst, r.analysis_date, userId);

                    const analysisId = aResult.lastInsertRowid;

                    // Insert elements
                    for (const elem of [...majorOxides, ...traceElements]) {
                        const val = parseFloat(r[elem]);
                        if (!isNaN(val) && val > 0) {
                            const unit = majorOxides.includes(elem) ? 'wt%' : 'ppm';
                            await db.prepare('INSERT INTO elemental_data (analysis_id, element, value, unit) VALUES (?,?,?,?)').run(analysisId, elem, val, unit);
                        }
                    }
                    results.analyses++;
                } catch (e) { results.errors.push(`Analyses row ${i + 2}: ${e.message}`); }
            }
        }

        // Process Fabric Groups sheet
        if (wb.SheetNames.includes('Fabric Groups')) {
            const rows = XLSX.utils.sheet_to_json(wb.Sheets['Fabric Groups']);
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                const name = r['name*'] || r['name'];
                const code = r['code*'] || r['code'];
                if (!name) { results.errors.push(`Fabric Groups row ${i + 2}: missing name`); continue; }

                try {
                    await db.prepare(
                        'INSERT INTO fabric_groups (name, code, description, key_characteristics, typical_inclusions, color_range, firing_range, region, created_by) VALUES (?,?,?,?,?,?,?,?,?)'
                    ).run(name, code, r.description, r.key_characteristics, r.typical_inclusions, r.color_range, r.firing_range, r.region, userId);
                    results.fabricGroups++;
                } catch (e) {
                    if (e.message?.includes('UNIQUE') || e.message?.includes('duplicate')) {
                        results.errors.push(`Fabric Groups row ${i + 2}: '${name}' already exists`);
                    } else { results.errors.push(`Fabric Groups row ${i + 2}: ${e.message}`); }
                }
            }
        }

        res.json({
            message: `Import complete: ${results.samples} samples, ${results.analyses} analyses, ${results.fabricGroups} fabric groups`,
            results
        });
    } catch (e) {
        console.error('Import error:', e);
        res.status(500).json({ error: 'Failed to process Excel file: ' + e.message });
    }
});

// ===================== EXPORT =====================

// GET /api/import-export/export
router.get('/export', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { project_id } = req.query;
        const wb = XLSX.utils.book_new();

        // --- Samples sheet ---
        let sampleFilter = project_id ? 'WHERE s.project_id = ?' : '';
        let params = project_id ? [project_id] : [];
        const samples = await db.prepare(`
            SELECT s.*, p.name as project_name, fg.name as fabric_group_name, fg.code as fabric_group_code
            FROM samples s
            LEFT JOIN projects p ON s.project_id = p.id
            LEFT JOIN fabric_groups fg ON s.fabric_group_id = fg.id
            ${sampleFilter} ORDER BY s.sample_code
        `).all(...params);

        const sampleRows = samples.map(s => ({
            'Sample Code': s.sample_code, 'Project': s.project_name || '', 'Site': s.site_name || '',
            'Site Code': s.site_code || '', 'Context': s.excavation_context || '',
            'Stratigraphy': s.stratigraphic_unit || '', 'Period': s.period || '',
            'Chronology': s.chronology || '', 'Type': s.ceramic_type || '',
            'Form': s.vessel_form || '', 'Part': s.vessel_part || '',
            'Fabric Group': s.fabric_group_name || '', 'Fabric Code': s.fabric_group_code || '',
            'Color': s.color || '', 'Munsell': s.munsell_code || '',
            'Thickness (mm)': s.thickness_mm, 'Weight (g)': s.weight_g
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sampleRows), 'Samples');

        // --- Composition Matrix sheet ---
        const elemData = await db.prepare(`
            SELECT s.sample_code, s.site_name, s.period, fg.code as fabric_code,
                   a.method, a.laboratory, ed.element, ed.value, ed.unit
            FROM elemental_data ed
            JOIN analyses a ON ed.analysis_id = a.id
            JOIN samples s ON a.sample_id = s.id
            LEFT JOIN fabric_groups fg ON s.fabric_group_id = fg.id
            WHERE ed.is_below_detection = 0 ${project_id ? 'AND s.project_id = ?' : ''}
            ORDER BY s.sample_code, ed.element
        `).all(...params);

        const sampleMap = new Map();
        const allElements = new Set();
        for (const r of elemData) {
            if (!sampleMap.has(r.sample_code)) {
                sampleMap.set(r.sample_code, {
                    'Sample': r.sample_code, 'Site': r.site_name || '', 'Period': r.period || '',
                    'Fabric': r.fabric_code || '', 'Method': r.method || '', 'Lab': r.laboratory || ''
                });
            }
            sampleMap.get(r.sample_code)[`${r.element} (${r.unit})`] = r.value;
            allElements.add(r.element);
        }
        if (sampleMap.size > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([...sampleMap.values()]), 'Composition Matrix');
        }

        // --- Fabric Groups sheet ---
        const fgs = await db.prepare('SELECT * FROM fabric_groups ORDER BY name').all();
        const fgRows = fgs.map(f => ({
            'Name': f.name, 'Code': f.code, 'Description': f.description || '',
            'Inclusions': f.typical_inclusions || '', 'Color Range': f.color_range || '',
            'Firing Range': f.firing_range || '', 'Region': f.region || ''
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fgRows), 'Fabric Groups');

        // --- Projects sheet ---
        const projects = await db.prepare('SELECT * FROM projects ORDER BY name').all();
        const projRows = projects.map(p => ({
            'Name': p.name, 'PI': p.principal_investigator || '', 'University': p.university || '',
            'Funding': p.funding_source || '', 'Status': p.status, 'Start': p.start_date || ''
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projRows), 'Projects');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=ceramicdb-export.xlsx');
        res.send(buffer);
    } catch (e) {
        console.error('Export error:', e);
        res.status(500).json({ error: 'Export failed: ' + e.message });
    }
});

module.exports = router;
