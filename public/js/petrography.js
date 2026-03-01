/* ============================================
   CeramicDB — Petrography Module
   ============================================ */

const Petrography = {
    async load() {
        const page = document.getElementById('page-petrography');
        page.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Loading petrographic data...</div>';

        try {
            const data = await App.api('/api/petrography/observations');
            this.renderObservations(data.observations);
        } catch (err) {
            page.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
        }
    },

    renderObservations(observations) {
        const page = document.getElementById('page-petrography');
        page.innerHTML = `
            <div class="page-header">
                <div>
                    <h1><span class="header-icon">🔍</span>Petrographic Analysis</h1>
                    <p class="page-header-meta">${observations.length} petrographic records</p>
                </div>
                <button class="btn btn-primary" onclick="Petrography.openCreate()">+ New Observation</button>
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr><th>Sample</th><th>Fabric Group</th><th>Inclusions</th><th>Grain Size</th><th>Sorting</th><th>Firing Temp</th><th>Photos</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        ${observations.length ? observations.map(o => `
                            <tr>
                                <td class="table-code">${App.escapeHtml(o.sample_code)}</td>
                                <td>${o.fabric_group_name ? `<span class="badge badge-accent">${App.escapeHtml(o.fabric_group_code || o.fabric_group_name)}</span>` : '—'}</td>
                                <td>${App.escapeHtml(o.inclusion_types || '—')}</td>
                                <td>${App.escapeHtml(o.dominant_grain_size || '—')}</td>
                                <td>${App.escapeHtml(o.sorting || '—')}</td>
                                <td>${App.escapeHtml(o.estimated_firing_temp || '—')}</td>
                                <td>${o.microphotos?.length ? `<span class="badge badge-info">${o.microphotos.length} 📷</span>` : '—'}</td>
                                <td>
                                    <div class="btn-group">
                                        <button class="btn btn-sm btn-secondary" onclick="Petrography.openDetail(${o.id})">View</button>
                                        <button class="btn btn-sm btn-secondary" onclick="Petrography.openUploadPhoto(${o.id})">📷 Upload</button>
                                    </div>
                                </td>
                            </tr>
                        `).join('') : '<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">🔍</div><h3>No petrographic records</h3><p>Add thin-section observations for your ceramic samples.</p></div></td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },

    async openDetail(id) {
        const data = await App.api('/api/petrography/observations');
        const obs = data.observations.find(o => o.id === id);
        if (!obs) return;

        App.openModal(`
            <div class="modal-header">
                <h2>🔍 Petrography — ${App.escapeHtml(obs.sample_code)}</h2>
                <button class="modal-close" onclick="App.closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <div class="form-section">
                    <div class="form-section-title">🧱 Fabric Group</div>
                    <p>${App.escapeHtml(obs.fabric_group_name || 'Not assigned')}</p>
                </div>
                
                <div class="form-section">
                    <div class="form-section-title">🔬 Matrix</div>
                    <div class="form-row">
                        <div><label>Description</label><p>${App.escapeHtml(obs.matrix_description || '—')}</p></div>
                        <div><label>Optical Activity</label><p>${App.escapeHtml(obs.optical_activity || '—')}</p></div>
                    </div>
                    <div class="form-row">
                        <div><label>Color (PPL)</label><p>${App.escapeHtml(obs.matrix_color_ppl || '—')}</p></div>
                        <div><label>Color (XPL)</label><p>${App.escapeHtml(obs.matrix_color_xpl || '—')}</p></div>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-section-title">🪨 Inclusions</div>
                    <div class="form-row-3">
                        <div><label>Types</label><p>${App.escapeHtml(obs.inclusion_types || '—')}</p></div>
                        <div><label>Frequency</label><p>${App.escapeHtml(obs.inclusion_frequency || '—')}</p></div>
                        <div><label>Grain Size</label><p>${App.escapeHtml(obs.dominant_grain_size || '—')}</p></div>
                    </div>
                    <div class="form-row-3">
                        <div><label>Sorting</label><p>${App.escapeHtml(obs.sorting || '—')}</p></div>
                        <div><label>Roundness</label><p>${App.escapeHtml(obs.roundness || '—')}</p></div>
                        <div><label>Max Grain (mm)</label><p>${obs.max_grain_size_mm || '—'}</p></div>
                    </div>
                </div>

                <div class="form-section">
                    <div class="form-section-title">🔥 Technology</div>
                    <div class="form-row">
                        <div><label>Firing Temperature</label><p>${App.escapeHtml(obs.estimated_firing_temp || '—')}</p></div>
                        <div><label>Forming Technique</label><p>${App.escapeHtml(obs.forming_technique || '—')}</p></div>
                    </div>
                </div>

                ${obs.microphotos?.length ? `
                <div class="form-section">
                    <div class="form-section-title">📷 Microphotographs</div>
                    <div class="image-gallery">
                        ${obs.microphotos.map(p => `
                            <div class="gallery-item">
                                <img src="${p.file_path}" alt="${App.escapeHtml(p.caption || p.image_type)}" loading="lazy">
                                <div class="gallery-label">${App.escapeHtml(p.image_type)}${p.magnification ? ' ' + App.escapeHtml(p.magnification) : ''}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>` : ''}

                ${obs.notes ? `<div class="form-section"><div class="form-section-title">📝 Notes</div><p>${App.escapeHtml(obs.notes)}</p></div>` : ''}
            </div>
        `);
    },

    async openCreate() {
        const [samplesRes, fabricRes] = await Promise.all([
            App.api('/api/samples'),
            App.api('/api/petrography/fabric-groups')
        ]);

        App.openModal(`
            <div class="modal-header">
                <h2>➕ New Petrographic Observation</h2>
                <button class="modal-close" onclick="App.closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <form id="petro-form" onsubmit="return Petrography.saveObservation(event)">
                    <div class="form-section">
                        <div class="form-section-title">📋 Basic</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Sample *</label>
                                <select name="sample_id" required>
                                    <option value="">— Select —</option>
                                    ${samplesRes.samples.map(s => `<option value="${s.id}">${App.escapeHtml(s.sample_code)} — ${App.escapeHtml(s.site_name || '')}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Fabric Group</label>
                                <select name="fabric_group_id">
                                    <option value="">— None —</option>
                                    ${fabricRes.fabricGroups.map(fg => `<option value="${fg.id}">${App.escapeHtml(fg.code ? fg.code + ' — ' + fg.name : fg.name)}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Analyst</label><input name="analyst"></div>
                            <div class="form-group"><label>Analysis Date</label><input type="date" name="analysis_date"></div>
                        </div>
                    </div>

                    <div class="form-section">
                        <div class="form-section-title">🔬 Matrix</div>
                        <div class="form-group"><label>Description</label><textarea name="matrix_description" placeholder="Describe the clay matrix..."></textarea></div>
                        <div class="form-row-3">
                            <div class="form-group">
                                <label>Optical Activity</label>
                                <select name="optical_activity">
                                    <option value="">—</option>
                                    <option>Active</option><option>Slightly active</option><option>Inactive</option>
                                </select>
                            </div>
                            <div class="form-group"><label>Color (PPL)</label><input name="matrix_color_ppl"></div>
                            <div class="form-group"><label>Color (XPL)</label><input name="matrix_color_xpl"></div>
                        </div>
                    </div>

                    <div class="form-section">
                        <div class="form-section-title">🪨 Inclusions</div>
                        <div class="form-group"><label>Inclusion Types</label><input name="inclusion_types" placeholder="e.g. Quartz, feldspar, calcite, mica"></div>
                        <div class="form-row-3">
                            <div class="form-group">
                                <label>Frequency</label>
                                <select name="inclusion_frequency">
                                    <option value="">—</option>
                                    <option>&lt;5%</option><option>5-10%</option><option>10-20%</option><option>20-30%</option><option>&gt;30%</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Grain Size</label>
                                <select name="dominant_grain_size">
                                    <option value="">—</option>
                                    <option>Very fine (&lt;0.1mm)</option><option>Fine (0.1-0.25mm)</option><option>Medium (0.25-0.5mm)</option><option>Coarse (0.5-1mm)</option><option>Very coarse (&gt;1mm)</option>
                                </select>
                            </div>
                            <div class="form-group"><label>Max Grain (mm)</label><input type="number" step="0.01" name="max_grain_size_mm"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Sorting</label>
                                <select name="sorting">
                                    <option value="">—</option>
                                    <option>Well sorted</option><option>Moderately sorted</option><option>Poorly sorted</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Roundness</label>
                                <select name="roundness">
                                    <option value="">—</option>
                                    <option>Angular</option><option>Sub-angular</option><option>Sub-rounded</option><option>Rounded</option><option>Well-rounded</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <div class="form-section-title">🔥 Technology</div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Est. Firing Temperature</label>
                                <select name="estimated_firing_temp">
                                    <option value="">—</option>
                                    <option>&lt;700°C</option><option>700-800°C</option><option>800-900°C</option><option>900-1000°C</option><option>&gt;1000°C</option>
                                </select>
                            </div>
                            <div class="form-group"><label>Forming Technique</label><input name="forming_technique" placeholder="e.g. Wheel-thrown"></div>
                        </div>
                    </div>

                    <div class="form-section">
                        <div class="form-section-title">📝 Notes</div>
                        <div class="form-group"><textarea name="notes"></textarea></div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="document.getElementById('petro-form').requestSubmit()">Save Observation</button>
            </div>
        `);
    },

    async saveObservation(e) {
        e.preventDefault();
        const form = document.getElementById('petro-form');
        const data = Object.fromEntries(new FormData(form));
        data.sample_id = parseInt(data.sample_id);
        if (data.fabric_group_id) data.fabric_group_id = parseInt(data.fabric_group_id);
        if (data.max_grain_size_mm) data.max_grain_size_mm = parseFloat(data.max_grain_size_mm);

        try {
            await App.api('/api/petrography/observations', { method: 'POST', body: JSON.stringify(data) });
            App.notify('Observation saved', 'success');
            App.closeModal();
            this.load();
        } catch (err) {
            App.notify(err.message, 'error');
        }
        return false;
    },

    // ---- Photo Upload ----
    openUploadPhoto(petrographyId) {
        App.openModal(`
            <div class="modal-header">
                <h2>📷 Upload Microphotograph</h2>
                <button class="modal-close" onclick="App.closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <form id="photo-form" onsubmit="return Petrography.uploadPhoto(event, ${petrographyId})" enctype="multipart/form-data">
                    <div class="form-group">
                        <label>Image File *</label>
                        <input type="file" name="image" accept="image/*" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Image Type *</label>
                            <select name="image_type" required>
                                <option value="PPL">PPL (Plane-Polarized Light)</option>
                                <option value="XPL">XPL (Cross-Polarized Light)</option>
                                <option value="Reflected">Reflected Light</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Magnification</label>
                            <input name="magnification" placeholder="e.g. 40x, 100x">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Caption</label>
                        <input name="caption" placeholder="Brief description of the image">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="document.getElementById('photo-form').requestSubmit()">Upload</button>
            </div>
        `);
    },

    async uploadPhoto(e, petrographyId) {
        e.preventDefault();
        const form = document.getElementById('photo-form');
        const formData = new FormData(form);

        try {
            const res = await fetch(`/api/petrography/observations/${petrographyId}/microphotos`, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });
            if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
            App.notify('Photo uploaded', 'success');
            App.closeModal();
            this.load();
        } catch (err) {
            App.notify(err.message, 'error');
        }
        return false;
    },

    // ============ FABRIC GROUPS PAGE ============
    async loadFabricGroups() {
        const page = document.getElementById('page-fabric-groups');
        page.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Loading fabric groups...</div>';

        try {
            const data = await App.api('/api/petrography/fabric-groups');
            this.renderFabricGroups(data.fabricGroups);
        } catch (err) {
            page.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
        }
    },

    renderFabricGroups(groups) {
        const page = document.getElementById('page-fabric-groups');
        page.innerHTML = `
            <div class="page-header">
                <div>
                    <h1><span class="header-icon">🧱</span>Fabric Groups</h1>
                    <p class="page-header-meta">${groups.length} fabric groups (shared across all projects)</p>
                </div>
                <button class="btn btn-primary" onclick="Petrography.openCreateFabricGroup()">+ New Fabric Group</button>
            </div>

            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1rem;">
                ${groups.length ? groups.map(fg => `
                    <div class="card">
                        <div class="card-header">
                            <h3>${fg.code ? `<span class="badge badge-accent" style="margin-right:0.4rem">${App.escapeHtml(fg.code)}</span>` : ''}${App.escapeHtml(fg.name)}</h3>
                        </div>
                        <div class="card-body">
                            <p style="font-size:0.82rem;color:var(--gray-600);margin-bottom:0.5rem">${App.escapeHtml(fg.description || '')}</p>
                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.3rem; font-size:0.78rem; color:var(--gray-500)">
                                <div><strong>Inclusions:</strong> ${App.escapeHtml(fg.typical_inclusions || '—')}</div>
                                <div><strong>Color:</strong> ${App.escapeHtml(fg.color_range || '—')}</div>
                                <div><strong>Firing:</strong> ${App.escapeHtml(fg.firing_range || '—')}</div>
                                <div><strong>Samples:</strong> ${fg.sample_count || 0}</div>
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-sm btn-secondary" onclick="Petrography.openEditFabricGroup(${fg.id})">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="Petrography.deleteFabricGroup(${fg.id})">Delete</button>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">🧱</div><h3>No fabric groups</h3><p>Create your first fabric group taxonomy.</p></div>'}
            </div>
        `;
    },

    openCreateFabricGroup() {
        this._showFabricGroupForm(null);
    },

    async openEditFabricGroup(id) {
        const data = await App.api(`/api/petrography/fabric-groups/${id}`);
        this._showFabricGroupForm(data.fabricGroup);
    },

    _showFabricGroupForm(fg) {
        const isEdit = !!fg;
        fg = fg || {};

        App.openModal(`
            <div class="modal-header">
                <h2>${isEdit ? '✏️ Edit' : '➕ New'} Fabric Group</h2>
                <button class="modal-close" onclick="App.closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <form id="fg-form" onsubmit="return Petrography.saveFabricGroup(event, ${isEdit ? fg.id : 'null'})">
                    <div class="form-row">
                        <div class="form-group"><label>Name *</label><input name="name" value="${App.escapeHtml(fg.name || '')}" required></div>
                        <div class="form-group"><label>Code</label><input name="code" value="${App.escapeHtml(fg.code || '')}" placeholder="e.g. FC, CQR"></div>
                    </div>
                    <div class="form-group"><label>Description</label><textarea name="description">${App.escapeHtml(fg.description || '')}</textarea></div>
                    <div class="form-group"><label>Key Characteristics</label><input name="key_characteristics" value="${App.escapeHtml(fg.key_characteristics || '')}"></div>
                    <div class="form-group"><label>Typical Inclusions</label><input name="typical_inclusions" value="${App.escapeHtml(fg.typical_inclusions || '')}"></div>
                    <div class="form-row-3">
                        <div class="form-group"><label>Color Range</label><input name="color_range" value="${App.escapeHtml(fg.color_range || '')}"></div>
                        <div class="form-group"><label>Firing Range</label><input name="firing_range" value="${App.escapeHtml(fg.firing_range || '')}"></div>
                        <div class="form-group"><label>Region</label><input name="region" value="${App.escapeHtml(fg.region || '')}"></div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="document.getElementById('fg-form').requestSubmit()">${isEdit ? 'Update' : 'Create'}</button>
            </div>
        `);
    },

    async saveFabricGroup(e, id) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(document.getElementById('fg-form')));

        try {
            if (id) {
                await App.api(`/api/petrography/fabric-groups/${id}`, { method: 'PUT', body: JSON.stringify(data) });
                App.notify('Fabric group updated', 'success');
            } else {
                await App.api('/api/petrography/fabric-groups', { method: 'POST', body: JSON.stringify(data) });
                App.notify('Fabric group created', 'success');
            }
            App.closeModal();
            this.loadFabricGroups();
        } catch (err) {
            App.notify(err.message, 'error');
        }
        return false;
    },

    async deleteFabricGroup(id) {
        if (!confirm('Delete this fabric group?')) return;
        try {
            await App.api(`/api/petrography/fabric-groups/${id}`, { method: 'DELETE' });
            App.notify('Fabric group deleted', 'success');
            this.loadFabricGroups();
        } catch (err) {
            App.notify(err.message, 'error');
        }
    }
};
