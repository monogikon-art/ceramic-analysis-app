/* ============================================
   CeramicDB — Dashboard Module
   ============================================ */

const Dashboard = {
    async load() {
        const page = document.getElementById('page-dashboard');
        page.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Loading dashboard...</div>';

        try {
            const stats = await App.api('/api/processing/dashboard-stats');

            page.innerHTML = `
                <div class="page-header">
                    <div>
                        <h1><span class="header-icon">📊</span>Dashboard</h1>
                        <p class="page-header-meta">Overview of your ceramic analysis data</p>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">🏺</div>
                        <div class="stat-value">${stats.totalSamples}</div>
                        <div class="stat-label">Ceramic Samples</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🔬</div>
                        <div class="stat-value">${stats.totalAnalyses}</div>
                        <div class="stat-label">Analyses</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">📁</div>
                        <div class="stat-value">${stats.totalProjects}</div>
                        <div class="stat-label">Active Projects</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🧱</div>
                        <div class="stat-value">${stats.totalFabricGroups}</div>
                        <div class="stat-label">Fabric Groups</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🔍</div>
                        <div class="stat-value">${stats.totalPetrography}</div>
                        <div class="stat-label">Petrographic Records</div>
                    </div>
                </div>

                <div class="dashboard-grid">
                    <div class="card">
                        <div class="card-header">
                            <h3>📦 Recent Samples</h3>
                            <button class="btn btn-sm btn-secondary" onclick="App.navigate('samples')">View All</button>
                        </div>
                        <div class="card-body">
                            ${stats.recentSamples.length ? `
                                <table>
                                    <thead><tr><th>Code</th><th>Site</th><th>Type</th><th>Added</th></tr></thead>
                                    <tbody>
                                        ${stats.recentSamples.map(s => `
                                            <tr>
                                                <td class="table-code">${App.escapeHtml(s.sample_code)}</td>
                                                <td>${App.escapeHtml(s.site_name || '—')}</td>
                                                <td>${App.escapeHtml(s.ceramic_type || '—')}</td>
                                                <td>${App.formatDate(s.created_at)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : '<div class="empty-state"><div class="empty-state-icon">🏺</div><h3>No samples yet</h3><p>Register your first ceramic sample to get started.</p></div>'}
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <h3>🔬 Recent Analyses</h3>
                            <button class="btn btn-sm btn-secondary" onclick="App.navigate('analyses')">View All</button>
                        </div>
                        <div class="card-body">
                            ${stats.recentAnalyses.length ? stats.recentAnalyses.map(a => `
                                <div class="activity-item">
                                    <div class="activity-icon">🔬</div>
                                    <div>
                                        <div class="activity-text"><strong>${App.escapeHtml(a.sample_code)}</strong> — ${App.escapeHtml(a.method)}</div>
                                        <div class="activity-time">${App.escapeHtml(a.laboratory || '')} · ${App.formatDate(a.analysis_date)}</div>
                                    </div>
                                </div>
                            `).join('') : '<div class="empty-state"><p>No analyses recorded yet.</p></div>'}
                        </div>
                    </div>
                </div>

                ${stats.methodDistribution.length || stats.siteDistribution.length ? `
                <div class="charts-grid">
                    ${stats.methodDistribution.length ? `
                    <div class="card">
                        <div class="card-header"><h3>Analysis Methods</h3></div>
                        <div class="card-body">
                            <div class="chart-container"><canvas id="chart-methods"></canvas></div>
                        </div>
                    </div>` : ''}
                    ${stats.siteDistribution.length ? `
                    <div class="card">
                        <div class="card-header"><h3>Samples by Site</h3></div>
                        <div class="card-body">
                            <div class="chart-container"><canvas id="chart-sites"></canvas></div>
                        </div>
                    </div>` : ''}
                </div>` : ''}
            `;

            // Render charts
            if (stats.methodDistribution.length) {
                new Chart(document.getElementById('chart-methods'), {
                    type: 'doughnut',
                    data: {
                        labels: stats.methodDistribution.map(m => m.method),
                        datasets: [{
                            data: stats.methodDistribution.map(m => m.count),
                            backgroundColor: ['#4263eb', '#f76707', '#37b24d', '#ae3ec9', '#f59f00', '#1098ad']
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
                });
            }
            if (stats.siteDistribution.length) {
                new Chart(document.getElementById('chart-sites'), {
                    type: 'bar',
                    data: {
                        labels: stats.siteDistribution.map(s => s.site_name),
                        datasets: [{
                            label: 'Samples',
                            data: stats.siteDistribution.map(s => s.count),
                            backgroundColor: '#748ffc',
                            borderRadius: 4
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: true,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
                    }
                });
            }
        } catch (err) {
            page.innerHTML = `<div class="empty-state"><h3>Error loading dashboard</h3><p>${App.escapeHtml(err.message)}</p></div>`;
        }
    }
};
