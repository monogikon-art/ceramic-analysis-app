/* ============================================
   CeramicDB — Projects Module
   ============================================ */

const Projects = {
    async load() {
        const page = document.getElementById('page-projects');
        page.innerHTML = '<div class="loading-overlay"><div class="spinner"></div> Loading projects...</div>';

        try {
            const data = await App.api('/api/projects');
            this.render(data.projects);
        } catch (err) {
            page.innerHTML = `<div class="empty-state"><h3>Error</h3><p>${App.escapeHtml(err.message)}</p></div>`;
        }
    },

    render(projects) {
        const page = document.getElementById('page-projects');
        page.innerHTML = `
            <div class="page-header">
                <div>
                    <h1><span class="header-icon">📁</span>Research Projects</h1>
                    <p class="page-header-meta">${projects.length} projects</p>
                </div>
                <button class="btn btn-primary" onclick="Projects.openCreate()">+ New Project</button>
            </div>

            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:1rem">
                ${projects.length ? projects.map(p => `
                    <div class="card">
                        <div class="card-header">
                            <h3>${App.escapeHtml(p.name)}</h3>
                            <span class="badge ${p.status === 'active' ? 'badge-success' : 'badge-gray'}">${p.status}</span>
                        </div>
                        <div class="card-body">
                            ${p.description ? `<p style="font-size:0.82rem;color:var(--gray-600);margin-bottom:0.75rem">${App.escapeHtml(p.description)}</p>` : ''}
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.3rem;font-size:0.78rem;color:var(--gray-500)">
                                <div><strong>PI:</strong> ${App.escapeHtml(p.principal_investigator || '—')}</div>
                                <div><strong>University:</strong> ${App.escapeHtml(p.university || '—')}</div>
                                <div><strong>Samples:</strong> ${p.sample_count}</div>
                                <div><strong>Members:</strong> ${p.member_count}</div>
                                ${p.funding_source ? `<div style="grid-column:1/-1"><strong>Funding:</strong> ${App.escapeHtml(p.funding_source)}</div>` : ''}
                            </div>
                        </div>
                        <div class="card-footer">
                            <button class="btn btn-sm btn-secondary" onclick="Projects.openEdit(${p.id})">Edit</button>
                            <button class="btn btn-sm btn-danger" onclick="Projects.delete(${p.id})">Delete</button>
                        </div>
                    </div>
                `).join('') : '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">📁</div><h3>No projects yet</h3><p>Create a research project to organize your samples.</p></div>'}
            </div>
        `;
    },

    openCreate() {
        this._showForm(null);
    },

    async openEdit(id) {
        const data = await App.api(`/api/projects/${id}`);
        this._showForm(data.project);
    },

    _showForm(proj) {
        const p = proj || {};
        const isEdit = !!proj;

        App.openModal(`
            <div class="modal-header">
                <h2>${isEdit ? '✏️ Edit' : '➕ New'} Project</h2>
                <button class="modal-close" onclick="App.closeModal()">✕</button>
            </div>
            <div class="modal-body">
                <form id="project-form" onsubmit="return Projects.save(event, ${isEdit ? p.id : 'null'})">
                    <div class="form-group"><label>Name *</label><input name="name" value="${App.escapeHtml(p.name || '')}" required></div>
                    <div class="form-group"><label>Description</label><textarea name="description">${App.escapeHtml(p.description || '')}</textarea></div>
                    <div class="form-row">
                        <div class="form-group"><label>Principal Investigator</label><input name="principal_investigator" value="${App.escapeHtml(p.principal_investigator || '')}"></div>
                        <div class="form-group"><label>University</label><input name="university" value="${App.escapeHtml(p.university || '')}"></div>
                    </div>
                    <div class="form-group"><label>Funding Source</label><input name="funding_source" value="${App.escapeHtml(p.funding_source || '')}"></div>
                    <div class="form-row">
                        <div class="form-group"><label>Start Date</label><input type="date" name="start_date" value="${p.start_date || ''}"></div>
                        <div class="form-group"><label>End Date</label><input type="date" name="end_date" value="${p.end_date || ''}"></div>
                    </div>
                    ${isEdit ? `
                    <div class="form-group">
                        <label>Status</label>
                        <select name="status">
                            <option value="active" ${p.status === 'active' ? 'selected' : ''}>Active</option>
                            <option value="completed" ${p.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="archived" ${p.status === 'archived' ? 'selected' : ''}>Archived</option>
                        </select>
                    </div>` : ''}
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                <button class="btn btn-primary" onclick="document.getElementById('project-form').requestSubmit()">${isEdit ? 'Update' : 'Create'}</button>
            </div>
        `);
    },

    async save(e, id) {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(document.getElementById('project-form')));

        try {
            if (id) {
                await App.api(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
                App.notify('Project updated', 'success');
            } else {
                await App.api('/api/projects', { method: 'POST', body: JSON.stringify(data) });
                App.notify('Project created', 'success');
            }
            App.closeModal();
            this.load();
        } catch (err) {
            App.notify(err.message, 'error');
        }
        return false;
    },

    async delete(id) {
        if (!confirm('Delete this project? Samples will be unlinked but not deleted.')) return;
        try {
            await App.api(`/api/projects/${id}`, { method: 'DELETE' });
            App.notify('Project deleted', 'success');
            this.load();
        } catch (err) {
            App.notify(err.message, 'error');
        }
    }
};
