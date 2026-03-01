const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { createDatabase } = require('./db/database');
const { initDatabase } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: process.env.SESSION_SECRET || 'ceramicdb-dev-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production' && process.env.USE_SSL === 'true',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Uploads directory
const uploadsDir = path.join(__dirname, 'uploads', 'microphotos');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/samples', require('./routes/samples'));
app.use('/api/analyses', require('./routes/analyses'));
app.use('/api/petrography', require('./routes/petrography'));
app.use('/api/processing', require('./routes/processing'));
app.use('/api/import-export', require('./routes/import-export'));

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
    try {
        const db = await createDatabase();
        await initDatabase(db);
        app.locals.db = db;

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🏺 CeramicDB server running at http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
