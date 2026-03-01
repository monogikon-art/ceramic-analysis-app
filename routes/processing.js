const express = require('express');
const router = express.Router();

function requireAuth(req, res, next) {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
    next();
}

// GET /api/processing/statistics
router.get('/statistics', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { project_id, sample_ids, fabric_group_id } = req.query;
        let sampleFilter = '', params = [];

        if (sample_ids) {
            const ids = sample_ids.split(',');
            sampleFilter = `AND s.id IN (${ids.map(() => '?').join(',')})`;
            params.push(...ids);
        } else if (project_id) {
            sampleFilter = 'AND s.project_id = ?';
            params.push(project_id);
        }
        if (fabric_group_id) {
            sampleFilter += ' AND s.fabric_group_id = ?';
            params.push(fabric_group_id);
        }

        const data = await db.prepare(`
            SELECT ed.element, ed.value, ed.unit, s.sample_code, s.site_name, fg.name as fabric_group_name
            FROM elemental_data ed
            JOIN analyses a ON ed.analysis_id = a.id
            JOIN samples s ON a.sample_id = s.id
            LEFT JOIN fabric_groups fg ON s.fabric_group_id = fg.id
            WHERE ed.is_below_detection = 0 ${sampleFilter}
            ORDER BY ed.element, s.sample_code
        `).all(...params);

        const elementGroups = {};
        for (const row of data) {
            if (!elementGroups[row.element]) elementGroups[row.element] = [];
            elementGroups[row.element].push(row);
        }

        const statistics = {};
        for (const [elem, rows] of Object.entries(elementGroups)) {
            const values = rows.map(r => r.value).filter(v => v != null);
            if (values.length === 0) continue;
            values.sort((a, b) => a - b);
            const n = values.length;
            const sum = values.reduce((a, b) => a + b, 0);
            const mean = sum / n;
            const median = n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[Math.floor(n / 2)];
            const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n > 1 ? n - 1 : 1);
            const stdDev = Math.sqrt(variance);
            const cv = mean !== 0 ? (stdDev / mean) * 100 : 0;

            statistics[elem] = {
                n, unit: rows[0].unit, min: values[0], max: values[n - 1],
                mean: Math.round(mean * 100) / 100, median: Math.round(median * 100) / 100,
                stdDev: Math.round(stdDev * 100) / 100, cv: Math.round(cv * 10) / 10,
                values: rows.map(r => ({ sample_code: r.sample_code, value: r.value, site_name: r.site_name, fabric_group: r.fabric_group_name }))
            };
        }
        res.json({ statistics });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/processing/composition-matrix
router.get('/composition-matrix', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { project_id, sample_ids, unit } = req.query;
        let sampleFilter = '', params = [];

        if (sample_ids) {
            const ids = sample_ids.split(',');
            sampleFilter = `AND s.id IN (${ids.map(() => '?').join(',')})`;
            params.push(...ids);
        } else if (project_id) {
            sampleFilter = 'AND s.project_id = ?';
            params.push(project_id);
        }

        const data = await db.prepare(`
            SELECT s.id as sample_id, s.sample_code, s.site_name, s.site_code, s.period,
                   s.chronology, s.ceramic_type, s.vessel_form,
                   fg.name as fabric_group_name, fg.code as fabric_group_code,
                   ed.element, ed.value, ed.unit, a.method, a.laboratory
            FROM elemental_data ed
            JOIN analyses a ON ed.analysis_id = a.id
            JOIN samples s ON a.sample_id = s.id
            LEFT JOIN fabric_groups fg ON s.fabric_group_id = fg.id
            WHERE ed.is_below_detection = 0 ${sampleFilter}
            ORDER BY s.sample_code, ed.element
        `).all(...params);

        const samplesMap = new Map();
        const allElements = new Set();

        for (const row of data) {
            if (!samplesMap.has(row.sample_code)) {
                samplesMap.set(row.sample_code, {
                    sample_id: row.sample_id, sample_code: row.sample_code,
                    site_name: row.site_name, site_code: row.site_code,
                    period: row.period, chronology: row.chronology,
                    ceramic_type: row.ceramic_type, vessel_form: row.vessel_form,
                    fabric_group: row.fabric_group_name, fabric_code: row.fabric_group_code,
                    method: row.method, laboratory: row.laboratory, elements: {}
                });
            }
            samplesMap.get(row.sample_code).elements[row.element] = row.value;
            allElements.add(row.element);
        }

        const majorOxides = ['SiO2', 'Al2O3', 'Fe2O3', 'CaO', 'MgO', 'Na2O', 'K2O', 'TiO2', 'P2O5', 'MnO'];
        const sortedElements = [
            ...majorOxides.filter(e => allElements.has(e)),
            ...[...allElements].filter(e => !majorOxides.includes(e)).sort()
        ];
        res.json({ elements: sortedElements, samples: [...samplesMap.values()] });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/processing/correlation
router.get('/correlation', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { project_id, elements: elemParam } = req.query;
        let sampleFilter = project_id ? 'AND s.project_id = ?' : '';
        let params = project_id ? [project_id] : [];

        const data = await db.prepare(`
            SELECT s.id as sample_id, ed.element, ed.value
            FROM elemental_data ed
            JOIN analyses a ON ed.analysis_id = a.id
            JOIN samples s ON a.sample_id = s.id
            WHERE ed.is_below_detection = 0 ${sampleFilter}
        `).all(...params);

        const sampleElements = {};
        const allElements = new Set();
        for (const row of data) {
            if (!sampleElements[row.sample_id]) sampleElements[row.sample_id] = {};
            sampleElements[row.sample_id][row.element] = row.value;
            allElements.add(row.element);
        }

        let targetElements = [...allElements].sort();
        if (elemParam) targetElements = elemParam.split(',').filter(e => allElements.has(e));

        const correlation = {};
        for (const e1 of targetElements) {
            correlation[e1] = {};
            for (const e2 of targetElements) {
                const pairs = Object.values(sampleElements).filter(s => s[e1] != null && s[e2] != null);
                if (pairs.length < 3) { correlation[e1][e2] = null; continue; }
                const n = pairs.length;
                const sumX = pairs.reduce((a, s) => a + s[e1], 0);
                const sumY = pairs.reduce((a, s) => a + s[e2], 0);
                const sumXY = pairs.reduce((a, s) => a + s[e1] * s[e2], 0);
                const sumX2 = pairs.reduce((a, s) => a + s[e1] * s[e1], 0);
                const sumY2 = pairs.reduce((a, s) => a + s[e2] * s[e2], 0);
                const denom = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
                const r = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
                correlation[e1][e2] = Math.round(r * 1000) / 1000;
            }
        }
        res.json({ elements: targetElements, correlation });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/processing/export
router.get('/export', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const { project_id, format = 'csv' } = req.query;
        let sampleFilter = project_id ? 'AND s.project_id = ?' : '';
        let params = project_id ? [project_id] : [];

        const data = await db.prepare(`
            SELECT s.sample_code, s.site_name, s.site_code, s.period, s.chronology,
                   s.ceramic_type, s.vessel_form, fg.name as fabric_group, fg.code as fabric_code,
                   a.method, a.laboratory, ed.element, ed.value, ed.unit
            FROM elemental_data ed
            JOIN analyses a ON ed.analysis_id = a.id
            JOIN samples s ON a.sample_id = s.id
            LEFT JOIN fabric_groups fg ON s.fabric_group_id = fg.id
            WHERE ed.is_below_detection = 0 ${sampleFilter}
            ORDER BY s.sample_code, ed.element
        `).all(...params);

        if (format === 'json') { res.json({ data }); return; }

        const samplesMap = new Map();
        const allElements = new Set();
        for (const row of data) {
            if (!samplesMap.has(row.sample_code)) {
                samplesMap.set(row.sample_code, {
                    sample_code: row.sample_code, site_name: row.site_name || '',
                    site_code: row.site_code || '', period: row.period || '',
                    chronology: row.chronology || '', ceramic_type: row.ceramic_type || '',
                    vessel_form: row.vessel_form || '', fabric_group: row.fabric_group || '',
                    fabric_code: row.fabric_code || '', method: row.method || '',
                    laboratory: row.laboratory || '', elements: {}
                });
            }
            samplesMap.get(row.sample_code).elements[row.element] = row.value;
            allElements.add(row.element);
        }

        const majorOxides = ['SiO2', 'Al2O3', 'Fe2O3', 'CaO', 'MgO', 'Na2O', 'K2O', 'TiO2', 'P2O5', 'MnO'];
        const sortedElements = [...majorOxides.filter(e => allElements.has(e)), ...[...allElements].filter(e => !majorOxides.includes(e)).sort()];
        const metaHeaders = ['Sample', 'Site', 'SiteCode', 'Period', 'Chronology', 'Type', 'Form', 'FabricGroup', 'FabricCode', 'Method', 'Laboratory'];
        const headers = [...metaHeaders, ...sortedElements];
        let csv = headers.join(',') + '\n';

        for (const sample of samplesMap.values()) {
            const row = [
                sample.sample_code, sample.site_name, sample.site_code, sample.period,
                sample.chronology, sample.ceramic_type, sample.vessel_form,
                sample.fabric_group, sample.fabric_code, sample.method, sample.laboratory,
                ...sortedElements.map(e => sample.elements[e] ?? '')
            ];
            csv += row.join(',') + '\n';
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=ceramicdb-export.csv');
        res.send(csv);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/processing/dashboard-stats
router.get('/dashboard-stats', requireAuth, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const stats = {
            totalSamples: (await db.prepare('SELECT COUNT(*) as count FROM samples').get()).count,
            totalAnalyses: (await db.prepare('SELECT COUNT(*) as count FROM analyses').get()).count,
            totalProjects: (await db.prepare("SELECT COUNT(*) as count FROM projects WHERE status = 'active'").get()).count,
            totalFabricGroups: (await db.prepare('SELECT COUNT(*) as count FROM fabric_groups').get()).count,
            totalPetrography: (await db.prepare('SELECT COUNT(*) as count FROM petrography').get()).count,
            recentSamples: await db.prepare('SELECT id, sample_code, site_name, ceramic_type, created_at FROM samples ORDER BY created_at DESC LIMIT 5').all(),
            recentAnalyses: await db.prepare(`
                SELECT a.id, a.method, a.laboratory, a.analysis_date, s.sample_code
                FROM analyses a JOIN samples s ON a.sample_id = s.id ORDER BY a.created_at DESC LIMIT 5
            `).all(),
            methodDistribution: await db.prepare('SELECT method, COUNT(*) as count FROM analyses GROUP BY method ORDER BY count DESC').all(),
            siteDistribution: await db.prepare('SELECT site_name, COUNT(*) as count FROM samples WHERE site_name IS NOT NULL GROUP BY site_name ORDER BY count DESC LIMIT 10').all()
        };
        res.json(stats);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
