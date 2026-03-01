const express = require('express');
const router = express.Router();

function requireAuth(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
    next();
}

// GET /api/projects
router.get('/', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const projects = await db.prepare(`
            SELECT p.*, u.first_name || ' ' || u.last_name as creator_name,
                   (SELECT COUNT(*) FROM samples WHERE project_id = p.id) as sample_count,
                   (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
            FROM projects p
            LEFT JOIN users u ON p.created_by = u.id
            ORDER BY p.updated_at DESC
        `).all();
        res.json({ projects });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/projects/:id
router.get('/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const project = await db.prepare(`
            SELECT p.*, u.first_name || ' ' || u.last_name as creator_name
            FROM projects p LEFT JOIN users u ON p.created_by = u.id WHERE p.id = ?
        `).get(req.params.id);
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const members = await db.prepare(`
            SELECT pm.*, u.first_name, u.last_name, u.email, u.university
            FROM project_members pm JOIN users u ON pm.user_id = u.id WHERE pm.project_id = ?
        `).all(req.params.id);
        res.json({ project, members });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/projects
router.post('/', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { name, description, principal_investigator, university, funding_source, start_date, end_date } = req.body;
        if (!name) return res.status(400).json({ error: 'Project name is required' });

        const result = await db.prepare(
            `INSERT INTO projects (name, description, principal_investigator, university, funding_source, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(name, description, principal_investigator, university, funding_source, start_date, end_date, req.session.userId);

        await db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(result.lastInsertRowid, req.session.userId, 'lead');
        const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json({ project });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// PUT /api/projects/:id
router.put('/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { name, description, principal_investigator, university, funding_source, start_date, end_date, status } = req.body;
        await db.prepare(`
            UPDATE projects SET name=?, description=?, principal_investigator=?, university=?,
            funding_source=?, start_date=?, end_date=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
        `).run(name, description, principal_investigator, university, funding_source, start_date, end_date, status, req.params.id);
        const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
        res.json({ project });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// DELETE /api/projects/:id
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        await db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
        res.json({ message: 'Project deleted' });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/projects/:id/members
router.post('/:id/members', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { user_id, role } = req.body;
        await db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(req.params.id, user_id, role || 'member');
        res.status(201).json({ message: 'Member added' });
    } catch (e) {
        if (e.message?.includes('UNIQUE') || e.message?.includes('duplicate')) {
            res.status(409).json({ error: 'User is already a member' });
        } else { console.error(e); res.status(500).json({ error: 'Server error' }); }
    }
});

module.exports = router;
