const express = require('express');
const router = express.Router();

function requireAuth(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
    next();
}

// GET /api/analyses
router.get('/', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { sample_id, method } = req.query;
        let where = [], params = [];
        if (sample_id) { where.push('a.sample_id = ?'); params.push(sample_id); }
        if (method) { where.push('a.method = ?'); params.push(method); }
        const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

        const analyses = await db.prepare(`
            SELECT a.*, s.sample_code, s.site_name,
                   (SELECT COUNT(*) FROM elemental_data WHERE analysis_id = a.id) as element_count
            FROM analyses a JOIN samples s ON a.sample_id = s.id
            ${whereClause} ORDER BY a.analysis_date DESC
        `).all(...params);
        res.json({ analyses });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/analyses/:id
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const analysis = await db.prepare(`
            SELECT a.*, s.sample_code, s.site_name FROM analyses a
            JOIN samples s ON a.sample_id = s.id WHERE a.id = ?
        `).get(req.params.id);
        if (!analysis) return res.status(404).json({ error: 'Analysis not found' });

        const elements = await db.prepare(`
            SELECT * FROM elemental_data WHERE analysis_id = ? ORDER BY
            CASE WHEN element IN ('SiO2','Al2O3','Fe2O3','CaO','MgO','Na2O','K2O','TiO2','P2O5','MnO') THEN 0 ELSE 1 END, element
        `).all(req.params.id);
        res.json({ analysis, elements });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/analyses
router.post('/', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { sample_id, method, laboratory, instrument, instrument_settings, analyst, analysis_date, reference_materials, calibration_notes, quality_notes, notes, elements } = req.body;
        if (!sample_id || !method) return res.status(400).json({ error: 'Sample ID and method are required' });

        const result = await db.prepare(`
            INSERT INTO analyses (sample_id, method, laboratory, instrument, instrument_settings, analyst, analysis_date, reference_materials, calibration_notes, quality_notes, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(sample_id, method, laboratory, instrument, instrument_settings, analyst, analysis_date, reference_materials, calibration_notes, quality_notes, notes, req.session.userId);

        const analysisId = result.lastInsertRowid;

        if (elements && Array.isArray(elements)) {
            for (const el of elements) {
                if (el.element && el.value != null) {
                    await db.prepare(
                        `INSERT INTO elemental_data (analysis_id, element, value, unit, error_value, error_type, detection_limit, is_below_detection) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                    ).run(analysisId, el.element, el.value, el.unit || 'wt%', el.error_value, el.error_type || 'absolute', el.detection_limit, el.is_below_detection ? 1 : 0);
                }
            }
        }

        const analysis = await db.prepare('SELECT * FROM analyses WHERE id = ?').get(analysisId);
        const elems = await db.prepare('SELECT * FROM elemental_data WHERE analysis_id = ?').all(analysisId);
        res.status(201).json({ analysis, elements: elems });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/analyses/:id/elements
router.put('/:id/elements', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { elements } = req.body;
        if (!elements || !Array.isArray(elements)) return res.status(400).json({ error: 'Elements array is required' });

        await db.prepare('DELETE FROM elemental_data WHERE analysis_id = ?').run(req.params.id);
        for (const el of elements) {
            if (el.element && el.value != null) {
                await db.prepare(
                    `INSERT INTO elemental_data (analysis_id, element, value, unit, error_value, error_type, detection_limit, is_below_detection) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                ).run(req.params.id, el.element, el.value, el.unit || 'wt%', el.error_value, el.error_type || 'absolute', el.detection_limit, el.is_below_detection ? 1 : 0);
            }
        }
        const elems = await db.prepare('SELECT * FROM elemental_data WHERE analysis_id = ?').all(req.params.id);
        res.json({ elements: elems });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/analyses/:id
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        await db.prepare('DELETE FROM analyses WHERE id = ?').run(req.params.id);
        res.json({ message: 'Analysis deleted' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
