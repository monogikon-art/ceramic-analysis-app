const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

function requireAuth(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
    next();
}

// Multer config
const storage = multer.diskStorage({
    destination(req, file, cb) {
        const dir = path.join(__dirname, '..', 'uploads', 'microphotos');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename(req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter(req, file, cb) {
        const allowed = ['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.bmp'];
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, allowed.includes(ext));
    }
});

// ===================== FABRIC GROUPS =====================

// GET /api/petrography/fabric-groups
router.get('/fabric-groups', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const groups = await db.prepare(`
            SELECT fg.*, (SELECT COUNT(*) FROM samples WHERE fabric_group_id = fg.id) as sample_count
            FROM fabric_groups fg ORDER BY fg.name
        `).all();
        res.json({ fabricGroups: groups });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/petrography/fabric-groups/:id
router.get('/fabric-groups/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const group = await db.prepare('SELECT * FROM fabric_groups WHERE id = ?').get(req.params.id);
        if (!group) return res.status(404).json({ error: 'Fabric group not found' });
        res.json({ fabricGroup: group });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/petrography/fabric-groups
router.post('/fabric-groups', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { name, code, description, key_characteristics, typical_inclusions, color_range, firing_range, region } = req.body;
        if (!name) return res.status(400).json({ error: 'Fabric group name is required' });

        const result = await db.prepare(
            'INSERT INTO fabric_groups (name, code, description, key_characteristics, typical_inclusions, color_range, firing_range, region, created_by) VALUES (?,?,?,?,?,?,?,?,?)'
        ).run(name, code, description, key_characteristics, typical_inclusions, color_range, firing_range, region, req.session.userId);
        const group = await db.prepare('SELECT * FROM fabric_groups WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ fabricGroup: group });
    } catch (e) {
        if (e.message?.includes('UNIQUE') || e.message?.includes('duplicate')) {
            return res.status(409).json({ error: 'A fabric group with this name or code already exists' });
        }
        console.error(e); res.status(500).json({ error: 'Server error' });
    }
});

// PUT /api/petrography/fabric-groups/:id
router.put('/fabric-groups/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { name, code, description, key_characteristics, typical_inclusions, color_range, firing_range, region } = req.body;
        await db.prepare(`
            UPDATE fabric_groups SET name=?, code=?, description=?, key_characteristics=?, typical_inclusions=?,
            color_range=?, firing_range=?, region=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
        `).run(name, code, description, key_characteristics, typical_inclusions, color_range, firing_range, region, req.params.id);
        const group = await db.prepare('SELECT * FROM fabric_groups WHERE id = ?').get(req.params.id);
        res.json({ fabricGroup: group });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/petrography/fabric-groups/:id
router.delete('/fabric-groups/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        await db.prepare('DELETE FROM fabric_groups WHERE id = ?').run(req.params.id);
        res.json({ message: 'Fabric group deleted' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ===================== OBSERVATIONS =====================

// GET /api/petrography/observations
router.get('/observations', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { sample_id } = req.query;
        let query = `
            SELECT pt.*, fg.name as fabric_group_name, fg.code as fabric_group_code,
                   s.sample_code, s.site_name
            FROM petrography pt
            LEFT JOIN fabric_groups fg ON pt.fabric_group_id = fg.id
            LEFT JOIN samples s ON pt.sample_id = s.id
        `;
        const params = [];
        if (sample_id) { query += ' WHERE pt.sample_id = ?'; params.push(sample_id); }
        query += ' ORDER BY pt.created_at DESC';

        const obs = await db.prepare(query).all(...params);
        for (const o of obs) {
            o.microphotos = await db.prepare('SELECT * FROM microphotos WHERE petrography_id = ?').all(o.id);
        }
        res.json({ observations: obs });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/petrography/observations
router.post('/observations', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const o = req.body;
        if (!o.sample_id) return res.status(400).json({ error: 'Sample ID is required' });

        const result = await db.prepare(`
            INSERT INTO petrography (sample_id, fabric_group_id, matrix_description, optical_activity,
                matrix_color_ppl, matrix_color_xpl, inclusion_types, inclusion_frequency,
                dominant_grain_size, max_grain_size_mm, sorting, roundness,
                void_description, void_frequency, estimated_firing_temp, forming_technique,
                analyst, analysis_date, notes, created_by)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
            o.sample_id, o.fabric_group_id || null, o.matrix_description, o.optical_activity,
            o.matrix_color_ppl, o.matrix_color_xpl, o.inclusion_types, o.inclusion_frequency,
            o.dominant_grain_size, o.max_grain_size_mm, o.sorting, o.roundness,
            o.void_description, o.void_frequency, o.estimated_firing_temp, o.forming_technique,
            o.analyst, o.analysis_date, o.notes, req.session.userId
        );
        const obs = await db.prepare('SELECT * FROM petrography WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ observation: obs });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/petrography/observations/:id
router.put('/observations/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const o = req.body;
        await db.prepare(`
            UPDATE petrography SET fabric_group_id=?, matrix_description=?, optical_activity=?,
                matrix_color_ppl=?, matrix_color_xpl=?, inclusion_types=?, inclusion_frequency=?,
                dominant_grain_size=?, max_grain_size_mm=?, sorting=?, roundness=?,
                void_description=?, void_frequency=?, estimated_firing_temp=?, forming_technique=?,
                analyst=?, analysis_date=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
        `).run(
            o.fabric_group_id || null, o.matrix_description, o.optical_activity,
            o.matrix_color_ppl, o.matrix_color_xpl, o.inclusion_types, o.inclusion_frequency,
            o.dominant_grain_size, o.max_grain_size_mm, o.sorting, o.roundness,
            o.void_description, o.void_frequency, o.estimated_firing_temp, o.forming_technique,
            o.analyst, o.analysis_date, o.notes, req.params.id
        );
        const obs = await db.prepare('SELECT * FROM petrography WHERE id = ?').get(req.params.id);
        res.json({ observation: obs });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/petrography/observations/:id
router.delete('/observations/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        await db.prepare('DELETE FROM petrography WHERE id = ?').run(req.params.id);
        res.json({ message: 'Observation deleted' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// ===================== MICROPHOTOGRAPHS =====================

// POST /api/petrography/observations/:id/microphotos
router.post('/observations/:id/microphotos', requireAuth, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Image file is required' });
        const db = req.app.locals.db;
        const { image_type, magnification, caption } = req.body;

        const result = await db.prepare(
            `INSERT INTO microphotos (petrography_id, file_path, original_filename, image_type, magnification, caption, uploaded_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(req.params.id, `/uploads/microphotos/${req.file.filename}`, req.file.originalname, image_type || 'PPL', magnification, caption, req.session.userId);

        const photo = await db.prepare('SELECT * FROM microphotos WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ microphoto: photo });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/petrography/microphotos/:id
router.delete('/microphotos/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const photo = await db.prepare('SELECT * FROM microphotos WHERE id = ?').get(req.params.id);
        if (photo) {
            const filepath = path.join(__dirname, '..', photo.file_path);
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
            await db.prepare('DELETE FROM microphotos WHERE id = ?').run(req.params.id);
        }
        res.json({ message: 'Microphoto deleted' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
