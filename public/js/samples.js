/* ============================================
   CeramicDB — Samples Module
   ============================================ */

const Samples = {
    data: [],
    filters: {},

    async load() {
        const page = document.getElementById('page-samples');
        page.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Loading samples...</div>';

        try {
            const [samplesRes, filtersRes] = await Promise.all([
                App.api('/api/samples'),
                App.api('/api/samples/filters')
            ]);
            this.data = samplesRes.samples;
            this.filters = filtersRes;
            this.render();
        } catch (err) {
            page.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
        }
    },

    render() {
        const page = document.getElementById('page-samples');
        page.innerHTML = `
            <div class="page-header">
                <div>
                    <h1><span class="header-icon">🏺</span>Ceramic Samples</h1>
                    <p class="page-header-meta">${this.data.length} samples registered</p>
                </div>
                <button class="btn btn-primary" onclick="Samples.openCreate()">+ Register Sample</button>
            </div>

            <div class="toolbar">
                <input type="text" class="search-input" placeholder="Search samples..." id="sample-search" oninput="Samples.filter()">
                <select id="filter-site" onchange="Samples.filter()">
                    <option value="">All Sites</option>
                    ${this.filters.sites?.map(s => `<option value="${App.escapeHtml(s)}">${App.escapeHtml(s)}</option>`).join('') || ''}
                </select>
                <select id="filter-period" onchange="Samples.filter()">
                    <option value="">All Periods</option>
                    ${this.filters.periods?.map(p => `<option value="${App.escapeHtml(p)}">${App.escapeHtml(p)}</option>`).join('') || ''}
                </select>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Site</th>
                            <th>Period</th>
                            <th>Type</th>
                            <th>Form</th>
                            <th>Fabric Group</th>
                            <th>Analyses</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="samples-tbody">
                        ${this.renderRows(this.data)}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRows(samples) {
        if (!samples.length) return '<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">🏺</div><h3>No samples found</h3><p>Register your first ceramic sample.</p></div></td></tr>';

        return samples.map(s => `
            <tr>
                <td class="table-code" style="cursor:pointer" onclick="Samples.openDetail(${s.id})">${App.escapeHtml(s.sample_code)}</td>
                <td>${App.escapeHtml(s.site_name || '—')}</td>
                <td>${s.period ? `<span class="badge badge-info">${App.escapeHtml(s.period)}</span>` : '—'}</td>
                <td>${App.escapeHtml(s.ceramic_type || '—')}</td>
                <td>${App.escapeHtml(s.vessel_form || '—')}</td>
                <td>${s.fabric_group_name ? `<span class="badge badge-accent">${App.escapeHtml(s.fabric_group_code || s.fabric_group_name)}</span>` : '—'}</td>
                <td>${s.analysis_count > 0 ? `<span class="badge badge-success">${s.analysis_count} 🔬</span>` : '—'}</td>
                <td>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-secondary" onclick="Samples.openDetail(${s.id})">View</button>
                        <button class="btn btn-sm btn-secondary" onclick="Samples.openEdit(${s.id})">Edit</button>
                    </div>
                </td>
            </tr>
        `).join('');
    },

    filter() {
        const search = document.getElementById('sample-search').value.toLowerCase();
        const site = document.getElementById('filter-site').value;
        const period = document.getElementById('filter-period').value;

        const filtered = this.data.filter(s => {
            if (search && !`${s.sample_code} ${s.site_name} ${s.ceramic_type} ${s.vessel_form}`.toLowerCase().includes(search)) return false;
            if (site && s.site_name !== site) return false;
            if (period && s.period !== period) return false;
            return true;
        });

        document.getElementById('samples-tbody').innerHTML = this.renderRows(filtered);
    },

    async openDetail(id) {
        try {
            const data = await App.api(`/api/samples/${id}`);
            const s = data.sample;

            App.openModal(`
                <div class="modal-header">
                    <h2>🏺 ${App.escapeHtml(s.sample_code)}</h2>
                    <button class="modal-close" onclick="App.closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="tabs">
                        <button class="tab active" onclick="Samples.switchTab(this, 'detail-info')">Information</button>
                        <button class="tab" onclick="Samples.switchTab(this, 'detail-analyses')">Analyses (${data.analyses.length})</button>
                        <button class="tab" onclick="Samples.switchTab(this, 'detail-petro')">Petrography (${data.petrography.length})</button>
                    </div>
                    
                    <div class="tab-content active" id="detail-info">
                        <div class="form-section">
                            <div class="form-section-title">📍 Site & Context</div>
                            <div class="form-row">
                                <div><label>Site</label><p>${App.escapeHtml(s.site_name || '—')}</p></div>
                                <div><label>Site Code</label><p>${App.escapeHtml(s.site_code || '—')}</p></div>
                            </div>
                            <div class="form-row">
                                <div><label>Context</label><p>${App.escapeHtml(s.excavation_context || '—')}</p></div>
                                <div><label>Stratigraphic Unit</label><p>${App.escapeHtml(s.stratigraphic_unit || '—')}</p></div>
                            </div>
                        </div>
                        <div class="form-section">
                            <div class="form-section-title">📅 Chronology</div>
                            <div class="form-row">
                                <div><label>Period</label><p>${App.escapeHtml(s.period || '—')}</p></div>
                                <div><label>Chronology</label><p>${App.escapeHtml(s.chronology || '—')}</p></div>
                            </div>
                        </div>
                        <div class="form-section">
                            <div class="form-section-title">🏺 Ceramic Description</div>
                            <div class="form-row-3">
                                <div><label>Type</label><p>${App.escapeHtml(s.ceramic_type || '—')}</p></div>
                                <div><label>Form</label><p>${App.escapeHtml(s.vessel_form || '—')}</p></div>
                                <div><label>Part</label><p>${App.escapeHtml(s.vessel_part || '—')}</p></div>
                            </div>
                            <div class="form-row-3">
                                <div><label>Color</label><p>${App.escapeHtml(s.color || '—')}${s.munsell_code ? ` (${App.escapeHtml(s.munsell_code)})` : ''}</p></div>
                                <div><label>Fabric Group</label><p>${App.escapeHtml(s.fabric_group_name || '—')}</p></div>
                                <div><label>Decoration</label><p>${App.escapeHtml(s.decoration || '—')}</p></div>
                            </div>
                        </div>
                        <div class="form-section">
                            <div class="form-section-title">📏 Measurements</div>
                            <div class="form-row-3">
                                <div><label>Thickness</label><p>${s.thickness_mm ? s.thickness_mm + ' mm' : '—'}</p></div>
                                <div><label>Weight</label><p>${s.weight_g ? s.weight_g + ' g' : '—'}</p></div>
                                <div><label>Condition</label><p>${App.escapeHtml(s.condition || '—')}</p></div>
                            </div>
                        </div>
                        ${s.description ? `<div class="form-section"><div class="form-section-title">📝 Notes</div><p>${App.escapeHtml(s.description)}</p></div>` : ''}
                    </div>
                    
                    <div class="tab-content" id="detail-analyses">
                        ${data.analyses.length ? data.analyses.map(a => `
                            <div class="card" style="margin-bottom:0.75rem">
                                <div class="card-header">
                                    <h3><span class="badge badge-primary">${App.escapeHtml(a.method)}</span> ${App.escapeHtml(a.laboratory || '')}</h3>
                                    <span style="font-size:0.8rem;color:var(--gray-500)">${App.formatDate(a.analysis_date)}</span>
                                </div>
                                <div class="card-body">
                                    <p style="font-size:0.82rem;color:var(--gray-500);margin-bottom:0.5rem">${a.element_count} elements measured</p>
                                    <button class="btn btn-sm btn-secondary" onclick="Analyses.openDetail(${a.id})">View Elemental Data</button>
                                </div>
                            </div>
                        `).join('') : '<div class="empty-state"><p>No analyses recorded for this sample.</p></div>'}
                    </div>
                    
                    <div class="tab-content" id="detail-petro">
                        ${data.petrography.length ? data.petrography.map(p => `
                            <div class="card" style="margin-bottom:0.75rem">
                                <div class="card-body">
                                    <p><strong>Fabric Group:</strong> ${App.escapeHtml(p.fabric_group_name || '—')}</p>
                                    <p><strong>Matrix:</strong> ${App.escapeHtml(p.matrix_description || '—')}</p>
                                    <p><strong>Inclusions:</strong> ${App.escapeHtml(p.inclusion_types || '—')} (${App.escapeHtml(p.inclusion_frequency || '—')})</p>
                                    <p><strong>Grain Size:</strong> ${App.escapeHtml(p.dominant_grain_size || '—')}, ${App.escapeHtml(p.sorting || '—')}, ${App.escapeHtml(p.roundness || '—')}</p>
                                    <p><strong>Firing Temp:</strong> ${App.escapeHtml(p.estimated_firing_temp || '—')}</p>
                                </div>
                            </div>
                        `).join('') : '<div class="empty-state"><p>No petrographic records for this sample.</p></div>'}
                    </div>
                </div>
            `);
        } catch (err) {
            App.notify(err.message, 'error');
        }
    },

    switchTab(el, tabId) {
        el.closest('.modal-body').querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        el.closest('.modal-body').querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        el.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    },

    async openCreate() {
        const [projectsRes, fabricRes] = await Promise.all([
            App.api('/api/projects'),
            App.api('/api/petrography/fabric-groups')
        ]);
        this._showForm(null, projectsRes.projects, fabricRes.fabricGroups);
    },

    async openEdit(id) {
        const [sampleRes, projectsRes, fabricRes] = await Promise.all([
            App.api(`/api/samples/${id}`),
            App.api('/api/projects'),
            App.api('/api/petrography/fabric-groups')
        ]);
        this._showForm(sampleRes.sample, projectsRes.projects, fabricRes.fabricGroups);
    },

    _showForm(sample, projects, fabricGroups) {
        const s = sample || {};
        const isEdit = !!sample;

        App.openModal(`
            <div class="modal-header">
                <h2>${isEdit ? '✏️ Edit' : '➕ Register'} Sample</h2>
                <button class="modal-close" onclick="App.closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <form id="sample-form" onsubmit="return Samples.save(event, ${isEdit ? s.id : 'null'})">
                    <div class="form-section">
                        <div class="form-section-title">📋 Basic Information</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Sample Code *</label>
                                <input type="text" name="sample_code" value="${App.escapeHtml(s.sample_code || '')}" required ${isEdit ? 'readonly' : ''}>
                            </div>
                            <div class="form-group">
                                <label>Project</label>
                                <select name="project_id">
                                    <option value="">— No Project —</option>
                                    ${projects.map(p => `<option value="${p.id}" ${s.project_id == p.id ? 'selected' : ''}>${App.escapeHtml(p.name)}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <div class="form-section-title">📍 Site & Context</div>
                        <div class="form-row">
                            <div class="form-group"><label>Site Name</label><input name="site_name" value="${App.escapeHtml(s.site_name || '')}"></div>
                            <div class="form-group"><label>Site Code</label><input name="site_code" value="${App.escapeHtml(s.site_code || '')}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Excavation Context</label><input name="excavation_context" value="${App.escapeHtml(s.excavation_context || '')}"></div>
                            <div class="form-group"><label>Stratigraphic Unit</label><input name="stratigraphic_unit" value="${App.escapeHtml(s.stratigraphic_unit || '')}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Trench</label><input name="trench" value="${App.escapeHtml(s.trench || '')}"></div>
                            <div class="form-group"><label>Locus</label><input name="locus" value="${App.escapeHtml(s.locus || '')}"></div>
                        </div>
                    </div>

                    <div class="form-section">
                        <div class="form-section-title">📅 Chronology</div>
                        <div class="form-row-3">
                            <div class="form-group"><label>Period</label><input name="period" value="${App.escapeHtml(s.period || '')}" placeholder="e.g. Late Bronze Age"></div>
                            <div class="form-group"><label>Chronology</label><input name="chronology" value="${App.escapeHtml(s.chronology || '')}" placeholder="e.g. LBA IB"></div>
                            <div class="form-group"><label>Dating Method</label><input name="dating_method" value="${App.escapeHtml(s.dating_method || '')}"></div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <div class="form-section-title">🏺 Ceramic Description</div>
                        <div class="form-row-3">
                            <div class="form-group"><label>Type</label><input name="ceramic_type" value="${App.escapeHtml(s.ceramic_type || '')}" placeholder="e.g. Cooking pot"></div>
                            <div class="form-group"><label>Vessel Form</label><input name="vessel_form" value="${App.escapeHtml(s.vessel_form || '')}" placeholder="e.g. Tripod pot"></div>
                            <div class="form-group"><label>Vessel Part</label><input name="vessel_part" value="${App.escapeHtml(s.vessel_part || '')}" placeholder="e.g. Body sherd"></div>
                        </div>
                        <div class="form-row-3">
                            <div class="form-group"><label>Color</label><input name="color" value="${App.escapeHtml(s.color || '')}"></div>
                            <div class="form-group"><label>Munsell Code</label><input name="munsell_code" value="${App.escapeHtml(s.munsell_code || '')}" placeholder="e.g. 5YR 5/4"></div>
                            <div class="form-group">
                                <label>Fabric Group</label>
                                <select name="fabric_group_id">
                                    <option value="">— None —</option>
                                    ${fabricGroups.map(fg => `<option value="${fg.id}" ${s.fabric_group_id == fg.id ? 'selected' : ''}>${App.escapeHtml(fg.code ? fg.code + ' — ' + fg.name : fg.name)}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Decoration</label><input name="decoration" value="${App.escapeHtml(s.decoration || '')}"></div>
                            <div class="form-group"><label>Surface Treatment</label><input name="surface_treatment" value="${App.escapeHtml(s.surface_treatment || '')}"></div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <div class="form-section-title">📏 Measurements</div>
                        <div class="form-row-3">
                            <div class="form-group"><label>Thickness (mm)</label><input type="number" step="0.1" name="thickness_mm" value="${s.thickness_mm || ''}"></div>
                            <div class="form-group"><label>Weight (g)</label><input type="number" step="0.1" name="weight_g" value="${s.weight_g || ''}"></div>
                            <div class="form-group"><label>Condition</label><input name="condition" value="${App.escapeHtml(s.condition || '')}"></div>
                        </div>
                        <div class="form-row-3">
                            <div class="form-group"><label>Length (mm)</label><input type="number" step="0.1" name="length_mm" value="${s.length_mm || ''}"></div>
                            <div class="form-group"><label>Width (mm)</label><input type="number" step="0.1" name="width_mm" value="${s.width_mm || ''}"></div>
                            <div class="form-group"><label>Completeness</label><input name="completeness" value="${App.escapeHtml(s.completeness || '')}"></div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <div class="form-section-title">📝 Notes</div>
                        <div class="form-group"><label>Description</label><textarea name="description">${App.escapeHtml(s.description || '')}</textarea></div>
                        <div class="form-group"><label>Notes</label><textarea name="notes">${App.escapeHtml(s.notes || '')}</textarea></div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="document.getElementById('sample-form').requestSubmit()">${isEdit ? 'Update' : 'Register'} Sample</button>
            </div>
        `);
    },

    async save(e, id) {
        e.preventDefault();
        const form = document.getElementById('sample-form');
        const data = Object.fromEntries(new FormData(form));

        // Convert numeric fields
        ['thickness_mm', 'weight_g', 'length_mm', 'width_mm', 'latitude', 'longitude'].forEach(f => {
            if (data[f]) data[f] = parseFloat(data[f]);
            else data[f] = null;
        });
        if (data.project_id) data.project_id = parseInt(data.project_id);
        if (data.fabric_group_id) data.fabric_group_id = parseInt(data.fabric_group_id);

        try {
            if (id) {
                await App.api(`/api/samples/${id}`, { method: 'PUT', body: JSON.stringify(data) });
                App.notify('Sample updated', 'success');
            } else {
                await App.api('/api/samples', { method: 'POST', body: JSON.stringify(data) });
                App.notify('Sample registered', 'success');
            }
            App.closeModal();
            this.load();
        } catch (err) {
            App.notify(err.message, 'error');
        }
        return false;
    }
};
