const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, university, department } = req.body;
        if (!email || !password || !first_name || !last_name) {
            return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
        }
        const db = req.app.locals.db;
        const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existing) return res.status(409).json({ error: 'An account with this email already exists' });

        const hash = bcrypt.hashSync(password, 10);
        const result = await db.prepare(
            `INSERT INTO users (email, password_hash, first_name, last_name, university, department) VALUES (?, ?, ?, ?, ?, ?)`
        ).run(email, hash, first_name, last_name, university || null, department || null);

        const user = await db.prepare('SELECT id, email, first_name, last_name, university, department, role FROM users WHERE id = ?').get(result.lastInsertRowid);
        req.session.userId = user.id;
        res.status(201).json({ user });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        const db = req.app.locals.db;
        const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user || !bcrypt.compareSync(password, user.password_hash)) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        req.session.userId = user.id;
        res.json({
            user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, university: user.university, department: user.department, role: user.role }
        });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
    try {
        const db = req.app.locals.db;
        const user = await db.prepare('SELECT id, email, first_name, last_name, university, department, role FROM users WHERE id = ?').get(req.session.userId);
        if (!user) return res.status(401).json({ error: 'User not found' });
        res.json({ user });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
