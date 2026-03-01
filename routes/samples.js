const express = require('express');
const router = express.Router();

function requireAuth(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
    next();
}

// GET /api/samples
router.get('/', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { project_id, site_name, period, fabric_group_id, search, limit = 100, offset = 0 } = req.query;
        let where = [], params = [];

        if (project_id) { where.push('s.project_id = ?'); params.push(project_id); }
        if (site_name) { where.push('s.site_name = ?'); params.push(site_name); }
        if (period) { where.push('s.period = ?'); params.push(period); }
        if (fabric_group_id) { where.push('s.fabric_group_id = ?'); params.push(fabric_group_id); }
        if (search) { where.push('(s.sample_code LIKE ? OR s.site_name LIKE ? OR s.description LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

        const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

        const samples = await db.prepare(`
            SELECT s.*, p.name as project_name, fg.name as fabric_group_name, fg.code as fabric_group_code,
                   (SELECT COUNT(*) FROM analyses WHERE sample_id = s.id) as analysis_count,
                   (SELECT COUNT(*) FROM petrography WHERE sample_id = s.id) as petrography_count
            FROM samples s
            LEFT JOIN projects p ON s.project_id = p.id
            LEFT JOIN fabric_groups fg ON s.fabric_group_id = fg.id
            ${whereClause}
            ORDER BY s.updated_at DESC
            LIMIT ? OFFSET ?
        `).all(...params, limit, offset);

        const total = await db.prepare(`SELECT COUNT(*) as count FROM samples s ${whereClause}`).get(...params);
        res.json({ samples, total: total.count });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/samples/filters
router.get('/filters', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const sites = await db.prepare('SELECT DISTINCT site_name FROM samples WHERE site_name IS NOT NULL ORDER BY site_name').all();
        const periods = await db.prepare('SELECT DISTINCT period FROM samples WHERE period IS NOT NULL ORDER BY period').all();
        const types = await db.prepare('SELECT DISTINCT ceramic_type FROM samples WHERE ceramic_type IS NOT NULL ORDER BY ceramic_type').all();
        const fabricGroups = await db.prepare('SELECT id, name, code FROM fabric_groups ORDER BY name').all();
        res.json({
            sites: sites.map(s => s.site_name),
            periods: periods.map(p => p.period),
            types: types.map(t => t.ceramic_type),
            fabricGroups
        });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/samples/:id
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const sample = await db.prepare(`
            SELECT s.*, p.name as project_name, fg.name as fabric_group_name, fg.code as fabric_group_code
            FROM samples s LEFT JOIN projects p ON s.project_id = p.id
            LEFT JOIN fabric_groups fg ON s.fabric_group_id = fg.id WHERE s.id = ?
        `).get(req.params.id);
        if (!sample) return res.status(404).json({ error: 'Sample not found' });

        const analyses = await db.prepare(`
            SELECT a.*, (SELECT COUNT(*) FROM elemental_data WHERE analysis_id = a.id) as element_count
            FROM analyses a WHERE a.sample_id = ? ORDER BY a.analysis_date DESC
        `).all(req.params.id);
        const petrography = await db.prepare(`
            SELECT pt.*, fg.name as fabric_group_name, fg.code as fabric_group_code
            FROM petrography pt LEFT JOIN fabric_groups fg ON pt.fabric_group_id = fg.id WHERE pt.sample_id = ?
        `).all(req.params.id);
        res.json({ sample, analyses, petrography });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/samples
router.post('/', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const s = req.body;
        if (!s.sample_code) return res.status(400).json({ error: 'Sample code is required' });

        const existing = await db.prepare('SELECT id FROM samples WHERE sample_code = ?').get(s.sample_code);
        if (existing) return res.status(409).json({ error: 'A sample with this code already exists' });

        const result = await db.prepare(`
            INSERT INTO samples (project_id, sample_code, site_name, site_code, excavation_context, stratigraphic_unit,
                trench, locus, period, chronology, dating_method, ceramic_type, vessel_form, vessel_part,
                decoration, surface_treatment, fabric_group_id, color, munsell_code, firing, hardness,
                length_mm, width_mm, thickness_mm, weight_g, rim_diameter_mm, base_diameter_mm,
                condition, completeness, latitude, longitude, elevation,
                collected_by, collection_date, current_location, description, notes, created_by
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
            s.project_id || null, s.sample_code, s.site_name, s.site_code, s.excavation_context, s.stratigraphic_unit,
            s.trench, s.locus, s.period, s.chronology, s.dating_method, s.ceramic_type, s.vessel_form, s.vessel_part,
            s.decoration, s.surface_treatment, s.fabric_group_id || null, s.color, s.munsell_code, s.firing, s.hardness,
            s.length_mm, s.width_mm, s.thickness_mm, s.weight_g, s.rim_diameter_mm, s.base_diameter_mm,
            s.condition, s.completeness, s.latitude, s.longitude, s.elevation,
            s.collected_by, s.collection_date, s.current_location, s.description, s.notes, req.session.userId
        );
        const sample = await db.prepare('SELECT * FROM samples WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ sample });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/samples/:id
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const s = req.body;
        await db.prepare(`
            UPDATE samples SET project_id=?, sample_code=?, site_name=?, site_code=?, excavation_context=?, stratigraphic_unit=?,
                trench=?, locus=?, period=?, chronology=?, dating_method=?, ceramic_type=?, vessel_form=?, vessel_part=?,
                decoration=?, surface_treatment=?, fabric_group_id=?, color=?, munsell_code=?, firing=?, hardness=?,
                length_mm=?, width_mm=?, thickness_mm=?, weight_g=?, rim_diameter_mm=?, base_diameter_mm=?,
                condition=?, completeness=?, latitude=?, longitude=?, elevation=?,
                collected_by=?, collection_date=?, current_location=?, description=?, notes=?,
                updated_at=CURRENT_TIMESTAMP WHERE id=?
        `).run(
            s.project_id || null, s.sample_code, s.site_name, s.site_code, s.excavation_context, s.stratigraphic_unit,
            s.trench, s.locus, s.period, s.chronology, s.dating_method, s.ceramic_type, s.vessel_form, s.vessel_part,
            s.decoration, s.surface_treatment, s.fabric_group_id || null, s.color, s.munsell_code, s.firing, s.hardness,
            s.length_mm, s.width_mm, s.thickness_mm, s.weight_g, s.rim_diameter_mm, s.base_diameter_mm,
            s.condition, s.completeness, s.latitude, s.longitude, s.elevation,
            s.collected_by, s.collection_date, s.current_location, s.description, s.notes,
            req.params.id
        );
        const sample = await db.prepare('SELECT * FROM samples WHERE id = ?').get(req.params.id);
        res.json({ sample });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/samples/:id
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        await db.prepare('DELETE FROM samples WHERE id = ?').run(req.params.id);
        res.json({ message: 'Sample deleted' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
