/* ============================================
   CeramicDB — Data Processing Module
   ============================================ */

const Processing = {
    charts: {},

    async load() {
        const page = document.getElementById('page-processing');
        page.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Loading processing tools...</div>';

        try {
            const [projectsRes, fabricRes] = await Promise.all([
                App.api('/api/projects'),
                App.api('/api/petrography/fabric-groups')
            ]);

            this.projects = projectsRes.projects;
            this.fabricGroups = fabricRes.fabricGroups;
            this.renderPage();
        } catch (err) {
            page.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
        }
    },

    renderPage() {
        const page = document.getElementById('page-processing');
        page.innerHTML = `
            <div class="page-header">
                <div>
                    <h1><span class="header-icon">📈</span>Data Processing & Visualization</h1>
                    <p class="page-header-meta">Analyze and export elemental composition data</p>
                </div>
                <div class="btn-group">
                    <button class="btn btn-accent" onclick="Processing.exportCSV()">📥 Export CSV</button>
                    <button class="btn btn-secondary" onclick="Processing.exportJSON()">📥 Export JSON</button>
                </div>
            </div>

            <div class="toolbar">
                <select id="proc-project" onchange="Processing.loadData()">
                    <option value="">All Projects</option>
                    ${this.projects.map(p => `<option value="${p.id}">${App.escapeHtml(p.name)}</option>`).join('')}
                </select>
                <select id="proc-fabric" onchange="Processing.loadData()">
                    <option value="">All Fabric Groups</option>
                    ${this.fabricGroups.map(fg => `<option value="${fg.id}">${App.escapeHtml(fg.code ? fg.code + ' — ' + fg.name : fg.name)}</option>`).join('')}
                </select>
                <button class="btn btn-primary" onclick="Processing.loadData()">🔄 Refresh</button>
            </div>

            <div class="tabs">
                <button class="tab active" onclick="Processing.switchTab(this, 'proc-stats')">Statistics</button>
                <button class="tab" onclick="Processing.switchTab(this, 'proc-matrix')">Composition Matrix</button>
                <button class="tab" onclick="Processing.switchTab(this, 'proc-charts')">Charts</button>
            </div>

            <div class="tab-content active" id="proc-stats">
                <div id="stats-content"><div class="loading-overlay"><div class="spinner"></div> Select filters and load data...</div></div>
            </div>
            <div class="tab-content" id="proc-matrix">
                <div id="matrix-content"></div>
            </div>
            <div class="tab-content" id="proc-charts">
                <div id="charts-content"></div>
            </div>
        `;

        this.loadData();
    },

    switchTab(el, tabId) {
        const page = document.getElementById('page-processing');
        page.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        page.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    },

    async loadData() {
        const projectId = document.getElementById('proc-project')?.value;
        const fabricId = document.getElementById('proc-fabric')?.value;

        let params = new URLSearchParams();
        if (projectId) params.set('project_id', projectId);
        if (fabricId) params.set('fabric_group_id', fabricId);
        const qs = params.toString();

        try {
            const [statsRes, matrixRes] = await Promise.all([
                App.api(`/api/processing/statistics?${qs}`),
                App.api(`/api/processing/composition-matrix?${qs}`)
            ]);

            this.renderStats(statsRes.statistics);
            this.renderMatrix(matrixRes);
            this.renderCharts(statsRes.statistics, matrixRes);
        } catch (err) {
            document.getElementById('stats-content').innerHTML = `<div class="empty-state"><p>${App.escapeHtml(err.message)}</p></div>`;
        }
    },

    renderStats(statistics) {
        const container = document.getElementById('stats-content');
        const elems = Object.values(statistics);

        if (!elems.length) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><h3>No data available</h3><p>Register analyses with elemental data to see statistics here.</p></div>';
            return;
        }

        const majorOxides = ['SiO2', 'Al2O3', 'Fe2O3', 'CaO', 'MgO', 'Na2O', 'K2O', 'TiO2', 'P2O5', 'MnO'];
        const majors = elems.filter(e => majorOxides.includes(e.element));
        const traces = elems.filter(e => !majorOxides.includes(e.element));

        const renderTable = (items, title) => {
            if (!items.length) return '';
            return `
                <div class="form-section">
                    <div class="form-section-title">${title}</div>
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr><th>Element</th><th>Unit</th><th>n</th><th>Min</th><th>Max</th><th>Mean</th><th>Median</th><th>Std Dev</th><th>CV%</th></tr>
                            </thead>
                            <tbody>
                                ${items.map(s => `
                                    <tr>
                                        <td style="font-family:var(--font-mono);font-weight:600">${s.element}</td>
                                        <td>${s.unit}</td>
                                        <td>${s.n}</td>
                                        <td style="font-family:var(--font-mono)">${s.min}</td>
                                        <td style="font-family:var(--font-mono)">${s.max}</td>
                                        <td style="font-family:var(--font-mono);font-weight:600">${s.mean}</td>
                                        <td style="font-family:var(--font-mono)">${s.median}</td>
                                        <td style="font-family:var(--font-mono)">${s.stddev}</td>
                                        <td>${s.cv}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        };

        container.innerHTML = renderTable(majors, '⚗️ Major Oxides (wt%)') + renderTable(traces, '🔬 Trace Elements (ppm)');
    },

    renderMatrix(matrixData) {
        const container = document.getElementById('matrix-content');

        if (!matrixData.samples.length) {
            container.innerHTML = '<div class="empty-state"><p>No composition data available.</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="form-section">
                <div class="form-section-title">📊 Sample × Element Composition Matrix</div>
                <div class="table-container" style="max-height:500px;overflow:auto">
                    <table>
                        <thead>
                            <tr>
                                <th style="position:sticky;left:0;background:var(--gray-50);z-index:1">Sample</th>
                                <th>Site</th>
                                <th>Fabric</th>
                                ${matrixData.elements.map(e => `<th style="font-family:var(--font-mono)">${e}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${matrixData.samples.map(s => `
                                <tr>
                                    <td class="table-code" style="position:sticky;left:0;background:white;z-index:1">${App.escapeHtml(s.sample_code)}</td>
                                    <td>${App.escapeHtml(s.site_name || '—')}</td>
                                    <td>${s.fabric_group ? `<span class="badge badge-accent">${App.escapeHtml(s.fabric_code || s.fabric_group)}</span>` : '—'}</td>
                                    ${matrixData.elements.map(e => `<td style="font-family:var(--font-mono);font-size:0.78rem;text-align:right">${s.elements[e] ?? '—'}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderCharts(statistics, matrixData) {
        const container = document.getElementById('charts-content');
        const elems = Object.values(statistics);

        if (!elems.length) {
            container.innerHTML = '<div class="empty-state"><p>No data available for visualization.</p></div>';
            return;
        }

        // Destroy existing charts
        Object.values(this.charts).forEach(c => c.destroy());
        this.charts = {};

        const majorOxides = ['SiO2', 'Al2O3', 'Fe2O3', 'CaO', 'MgO', 'Na2O', 'K2O', 'TiO2', 'P2O5', 'MnO'];
        const majorStats = elems.filter(e => majorOxides.includes(e.element));

        container.innerHTML = `
            <div class="charts-grid">
                <div class="card">
                    <div class="card-header"><h3>Mean Composition — Major Oxides</h3></div>
                    <div class="card-body"><div class="chart-container"><canvas id="chart-mean-oxides"></canvas></div></div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>Sample Comparison — Major Oxides</h3></div>
                    <div class="card-body"><div class="chart-container"><canvas id="chart-sample-compare"></canvas></div></div>
                </div>
            </div>
            ${matrixData.samples.length >= 2 ? `
            <div class="card" style="margin-bottom:1rem">
                <div class="card-header">
                    <h3>Element Scatter Plot</h3>
                    <div class="btn-group">
                        <select id="scatter-x" onchange="Processing.updateScatter()" style="padding:0.3rem 0.5rem;border:1px solid var(--gray-200);border-radius:4px;font-size:0.82rem">
                            ${majorStats.map((e, i) => `<option value="${e.element}" ${i === 0 ? 'selected' : ''}>${e.element}</option>`).join('')}
                        </select>
                        <span style="color:var(--gray-400)">vs</span>
                        <select id="scatter-y" onchange="Processing.updateScatter()" style="padding:0.3rem 0.5rem;border:1px solid var(--gray-200);border-radius:4px;font-size:0.82rem">
                            ${majorStats.map((e, i) => `<option value="${e.element}" ${i === 1 ? 'selected' : ''}>${e.element}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="card-body"><div class="chart-container"><canvas id="chart-scatter"></canvas></div></div>
            </div>` : ''}
        `;

        // Mean composition bar chart
        if (majorStats.length) {
            this.charts.meanOxides = new Chart(document.getElementById('chart-mean-oxides'), {
                type: 'bar',
                data: {
                    labels: majorStats.map(e => e.element),
                    datasets: [{
                        label: 'Mean (wt%)',
                        data: majorStats.map(e => e.mean),
                        backgroundColor: '#748ffc',
                        borderRadius: 4,
                        error: majorStats.map(e => e.stddev)
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, title: { display: true, text: 'wt%' } } }
                }
            });
        }

        // Sample comparison grouped bar chart
        if (matrixData.samples.length && majorStats.length) {
            const colors = ['#4263eb', '#f76707', '#37b24d', '#ae3ec9', '#f59f00', '#1098ad', '#e8590c', '#c2255c', '#5c940d', '#364fc7'];
            this.charts.sampleCompare = new Chart(document.getElementById('chart-sample-compare'), {
                type: 'bar',
                data: {
                    labels: majorOxides.filter(e => matrixData.elements.includes(e)),
                    datasets: matrixData.samples.slice(0, 8).map((s, i) => ({
                        label: s.sample_code,
                        data: majorOxides.filter(e => matrixData.elements.includes(e)).map(e => s.elements[e] ?? 0),
                        backgroundColor: colors[i % colors.length] + '99',
                        borderColor: colors[i % colors.length],
                        borderWidth: 1,
                        borderRadius: 2
                    }))
                },
                options: {
                    responsive: true, maintainAspectRatio: true,
                    plugins: { legend: { position: 'bottom', labels: { font: { size: 10 } } } },
                    scales: { y: { beginAtZero: true, title: { display: true, text: 'wt%' } } }
                }
            });
        }

        // Scatter plot
        if (matrixData.samples.length >= 2) {
            this._matrixData = matrixData;
            this.updateScatter();
        }
    },

    updateScatter() {
        const xElem = document.getElementById('scatter-x')?.value;
        const yElem = document.getElementById('scatter-y')?.value;
        if (!xElem || !yElem || !this._matrixData) return;

        if (this.charts.scatter) this.charts.scatter.destroy();

        // Color by fabric group
        const fabricColors = {};
        const palette = ['#4263eb', '#f76707', '#37b24d', '#ae3ec9', '#f59f00', '#1098ad', '#e8590c', '#c2255c', '#5c940d', '#364fc7'];
        let colorIdx = 0;

        const datasets = {};
        for (const s of this._matrixData.samples) {
            const xVal = s.elements[xElem];
            const yVal = s.elements[yElem];
            if (xVal == null || yVal == null) continue;

            const group = s.fabric_group || 'Unassigned';
            if (!fabricColors[group]) fabricColors[group] = palette[colorIdx++ % palette.length];

            if (!datasets[group]) {
                datasets[group] = {
                    label: group,
                    data: [],
                    backgroundColor: fabricColors[group] + 'cc',
                    borderColor: fabricColors[group],
                    borderWidth: 1,
                    pointRadius: 6,
                    pointHoverRadius: 8
                };
            }
            datasets[group].data.push({ x: xVal, y: yVal, label: s.sample_code });
        }

        this.charts.scatter = new Chart(document.getElementById('chart-scatter'), {
            type: 'scatter',
            data: { datasets: Object.values(datasets) },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 10 } } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const pt = ctx.raw;
                                return `${pt.label}: (${pt.x}, ${pt.y})`;
                            }
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: xElem } },
                    y: { title: { display: true, text: yElem } }
                }
            }
        });
    },

    async exportCSV() {
        const projectId = document.getElementById('proc-project')?.value;
        let url = '/api/processing/export?format=csv';
        if (projectId) url += `&project_id=${projectId}`;

        const res = await fetch(url, { credentials: 'same-origin' });
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ceramicdb-export.csv';
        a.click();
        App.notify('CSV exported', 'success');
    },

    async exportJSON() {
        const projectId = document.getElementById('proc-project')?.value;
        let url = '/api/processing/export?format=json';
        if (projectId) url += `&project_id=${projectId}`;

        const data = await App.api(url);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'ceramicdb-export.json';
        a.click();
        App.notify('JSON exported', 'success');
    }
};
