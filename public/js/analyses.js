/* ============================================
   CeramicDB — Analyses Module
   ============================================ */

const Analyses = {
    MAJOR_OXIDES: ['SiO2', 'Al2O3', 'Fe2O3', 'CaO', 'MgO', 'Na2O', 'K2O', 'TiO2', 'P2O5', 'MnO'],
    TRACE_ELEMENTS: ['Rb', 'Sr', 'Zr', 'Ba', 'Cr', 'Ni', 'V', 'Co', 'Cu', 'Zn', 'Pb', 'Y', 'Nb', 'La', 'Ce', 'Nd', 'Sc', 'Th'],
    METHODS: ['XRF', 'pXRF', 'ICP-MS', 'ICP-OES', 'LA-ICP-MS', 'NAA', 'SEM-EDS', 'PIXE', 'Other'],

    async load() {
        const page = document.getElementById('page-analyses');
        page.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Loading analyses...</div>';

        try {
            const data = await App.api('/api/analyses');
            this.render(data.analyses);
        } catch (err) {
            page.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
        }
    },

    render(analyses) {
        const page = document.getElementById('page-analyses');
        page.innerHTML = `
            <div class="page-header">
                <div>
                    <h1><span class="header-icon">🔬</span>Elemental Analyses</h1>
                    <p class="page-header-meta">${analyses.length} analyses recorded</p>
                </div>
                <button class="btn btn-primary" onclick="Analyses.openCreate()">+ New Analysis</button>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr><th>Sample</th><th>Method</th><th>Laboratory</th><th>Analyst</th><th>Date</th><th>Elements</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${analyses.length ? analyses.map(a => `
                            <tr>
                                <td class="table-code">${App.escapeHtml(a.sample_code)}</td>
                                <td><span class="badge badge-primary">${App.escapeHtml(a.method)}</span></td>
                                <td>${App.escapeHtml(a.laboratory || '—')}</td>
                                <td>${App.escapeHtml(a.analyst || '—')}</td>
                                <td>${App.formatDate(a.analysis_date)}</td>
                                <td><span class="badge badge-success">${a.element_count}</span></td>
                                <td>
                                    <div class="btn-group">
                                        <button class="btn btn-sm btn-secondary" onclick="Analyses.openDetail(${a.id})">View Data</button>
                                        <button class="btn btn-sm btn-danger" onclick="Analyses.delete(${a.id})">Delete</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : '<tr><td colspan="7"><div class="empty-state"><div class="empty-state-icon">🔬</div><h3>No analyses yet</h3><p>Create your first elemental analysis.</p></div></td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    async openDetail(id) {
        const data = await App.api(`/api/analyses/${id}`);
        const a = data.analysis;
        const majorElements = data.elements.filter(e => this.MAJOR_OXIDES.includes(e.element));
        const traceElements = data.elements.filter(e => !this.MAJOR_OXIDES.includes(e.element));

        App.openModal(`
            <div class="modal-header">
                <h2>🔬 Analysis — ${App.escapeHtml(a.sample_code)}</h2>
                <button class="modal-close" onclick="App.closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-row-3" style="margin-bottom:1rem">
                    <div><label>Method</label><p><span class="badge badge-primary">${App.escapeHtml(a.method)}</span></p></div>
                    <div><label>Laboratory</label><p>${App.escapeHtml(a.laboratory || '—')}</p></div>
                    <div><label>Date</label><p>${App.formatDate(a.analysis_date)}</p></div>
                </div>
                
                ${majorElements.length ? `
                <div class="form-section">
                    <div class="form-section-title">Major Oxides (wt%)</div>
                    <div class="table-container">
                        <table>
                            <thead><tr>${majorElements.map(e => `<th>${e.element}</th>`).join('')}</tr></thead>
                            <tbody><tr>${majorElements.map(e => `<td style="font-family:var(--font-mono);font-size:0.82rem">${e.value}${e.error_value ? ` ±${e.error_value}` : ''}</td>`).join('')}</tr></tbody>
                        </table>
                    </div>
                </div>` : ''}
                
                ${traceElements.length ? `
                <div class="form-section">
                    <div class="form-section-title">Trace Elements (ppm)</div>
                    <div class="table-container">
                        <table>
                            <thead><tr>${traceElements.map(e => `<th>${e.element}</th>`).join('')}</tr></thead>
                            <tbody><tr>${traceElements.map(e => `<td style="font-family:var(--font-mono);font-size:0.82rem">${e.value}${e.error_value ? ` ±${e.error_value}` : ''}</td>`).join('')}</tr></tbody>
                        </table>
                    </div>
                </div>` : ''}
                
                ${data.elements.length ? `
                <div class="form-section">
                    <div class="form-section-title">📊 Composition Chart</div>
                    <div class="chart-container"><canvas id="analysis-chart"></canvas></div>
                </div>` : ''}
            </div>
        `);

        // Render bar chart of major oxides
        if (majorElements.length) {
            setTimeout(() => {
                const canvas = document.getElementById('analysis-chart');
                if (canvas) {
                    new Chart(canvas, {
                        type: 'bar',
                        data: {
                            labels: majorElements.map(e => e.element),
                            datasets: [{
                                label: 'wt%',
                                data: majorElements.map(e => e.value),
                                backgroundColor: '#748ffc',
                                borderRadius: 4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: true,
                            plugins: { legend: { display: false } },
                            scales: { y: { beginAtZero: true, title: { display: true, text: 'wt%' } } }
                        }
                    });
                }
            }, 100);
        }
    },

    async openCreate() {
        const samplesRes = await App.api('/api/samples');
        const samples = samplesRes.samples;

        App.openModal(`
            <div class="modal-header">
                <h2>➕ New Analysis</h2>
                <button class="modal-close" onclick="App.closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <form id="analysis-form" onsubmit="return Analyses.save(event)">
                    <div class="form-section">
                        <div class="form-section-title">📋 Analysis Details</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Sample *</label>
                                <select name="sample_id" required>
                                    <option value="">— Select Sample —</option>
                                    ${samples.map(s => `<option value="${s.id}">${App.escapeHtml(s.sample_code)} — ${App.escapeHtml(s.site_name || 'Unknown site')}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Method *</label>
                                <select name="method" required>
                                    ${this.METHODS.map(m => `<option value="${m}">${m}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Laboratory</label><input name="laboratory"></div>
                            <div class="form-group"><label>Instrument</label><input name="instrument"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Analyst</label><input name="analyst"></div>
                            <div class="form-group"><label>Analysis Date</label><input type="date" name="analysis_date"></div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <div class="form-section-title">⚗️ Major Oxides (wt%)</div>
                        <div class="element-grid">
                            ${this.MAJOR_OXIDES.map(el => `
                                <div class="element-cell">
                                    <label>${el}</label>
                                    <input type="number" step="0.001" name="elem_${el}" placeholder="wt%">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <div class="form-section-title">🔬 Trace Elements (ppm)</div>
                        <div class="element-grid">
                            ${this.TRACE_ELEMENTS.map(el => `
                                <div class="element-cell">
                                    <label>${el}</label>
                                    <input type="number" step="0.01" name="elem_${el}" placeholder="ppm">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <div class="form-section-title">📝 Quality Notes</div>
                        <div class="form-group"><label>Reference Materials</label><input name="reference_materials"></div>
                        <div class="form-group"><label>Notes</label><textarea name="notes"></textarea></div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="document.getElementById('analysis-form').requestSubmit()">Save Analysis</button>
            </div>
        `);
    },

    async save(e) {
        e.preventDefault();
        const form = document.getElementById('analysis-form');
        const formData = Object.fromEntries(new FormData(form));

        // Build elements array
        const elements = [];
        [...this.MAJOR_OXIDES, ...this.TRACE_ELEMENTS].forEach(el => {
            const val = formData[`elem_${el}`];
            if (val) {
                elements.push({
                    element: el,
                    value: parseFloat(val),
                    unit: this.MAJOR_OXIDES.includes(el) ? 'wt%' : 'ppm'
                });
            }
        });

        const payload = {
            sample_id: parseInt(formData.sample_id),
            method: formData.method,
            laboratory: formData.laboratory,
            instrument: formData.instrument,
            analyst: formData.analyst,
            analysis_date: formData.analysis_date,
            reference_materials: formData.reference_materials,
            notes: formData.notes,
            elements
        };

        try {
            await App.api('/api/analyses', { method: 'POST', body: JSON.stringify(payload) });
            App.notify('Analysis saved', 'success');
            App.closeModal();
            this.load();
        } catch (err) {
            App.notify(err.message, 'error');
        }
        return false;
    },

    async delete(id) {
        if (!confirm('Delete this analysis and all its elemental data?')) return;
        try {
            await App.api(`/api/analyses/${id}`, { method: 'DELETE' });
            App.notify('Analysis deleted', 'success');
            this.load();
        } catch (err) {
            App.notify(err.message, 'error');
        }
    }
};
