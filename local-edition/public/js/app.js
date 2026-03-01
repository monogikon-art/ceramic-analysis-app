/**
 * CeramicDB Local Edition — Spreadsheet UI
 */
const App = {
    sheet: 'samples',
    columns: [],
    data: [],
    selected: new Set(),
    focusedCell: null,
    editingCell: null,
    undoStack: [],
    dirty: false,

    // ── Initialization ──────────────────────────
    async init() {
        await this.loadStats();
        await this.switchSheet('samples');
    },

    // ── Sheet switching ─────────────────────────
    async switchSheet(sheet) {
        this.sheet = sheet;
        this.selected.clear();
        this.focusedCell = null;

        document.querySelectorAll('.sheet-tab').forEach(t => t.classList.toggle('active', t.dataset.sheet === sheet));

        try {
            const [colRes, dataRes] = await Promise.all([
                fetch(`/api/columns/${sheet}`).then(r => r.json()),
                fetch(`/api/data/${sheet}`).then(r => r.json())
            ]);
            this.columns = colRes.columns;
            this.data = dataRes.data;
            this.dirty = dataRes.dirty;
            this.renderGrid();
            this.updateStatus(dataRes);
        } catch (e) {
            this.notify('Failed to load data: ' + e.message, 'error');
        }
    },

    // ── Grid rendering ──────────────────────────
    renderGrid() {
        const head = document.getElementById('grid-head');
        const body = document.getElementById('grid-body');
        const visibleCols = this.columns.filter(c => c !== 'ID');

        // Header
        let headerHtml = '<tr><th class="row-num-header"><input type="checkbox" class="row-checkbox" onchange="App.selectAll(this.checked)"></th>';
        visibleCols.forEach((col, i) => {
            headerHtml += `<th onclick="App.sortBy('${col}')" title="Click to sort">${col}</th>`;
        });
        headerHtml += '</tr>';
        head.innerHTML = headerHtml;

        // Body
        let bodyHtml = '';
        this.data.forEach((row, rowIdx) => {
            const isSelected = this.selected.has(row.ID);
            bodyHtml += `<tr data-id="${row.ID}" class="${isSelected ? 'selected' : ''}" ondblclick="App.startEdit(event)">`;
            bodyHtml += `<td onclick="App.toggleRow(${row.ID})"><input type="checkbox" class="row-checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); App.toggleRow(${row.ID})">${rowIdx + 1}</td>`;

            visibleCols.forEach((col, colIdx) => {
                const val = row[col] ?? '';
                const isNum = typeof val === 'number' && !isNaN(val);
                const cellClass = isNum ? 'num' : '';
                const displayVal = val === '' || val === null || val === undefined ? '' : val;
                bodyHtml += `<td class="${cellClass}" data-col="${col}" data-row-id="${row.ID}" onclick="App.focusCell(this)">${this.escapeHtml(String(displayVal))}</td>`;
            });
            bodyHtml += '</tr>';
        });

        if (this.data.length === 0) {
            bodyHtml = `<tr><td colspan="${visibleCols.length + 1}" style="text-align:center; padding:40px; color:var(--text-muted);">No data. Click "＋ Add Row" to create a record.</td></tr>`;
        }

        body.innerHTML = bodyHtml;

        // Update counts
        document.getElementById('row-count').textContent = `${this.data.length} rows`;
        document.getElementById('selected-count').textContent = `${this.selected.size} selected`;
        document.getElementById('info-summary').textContent = `Sheet: ${this.sheet} · ${this.columns.length} columns · ${this.data.length} rows`;

        this.updateSyncIndicator();
    },

    // ── Cell Focus ──────────────────────────────
    focusCell(td) {
        if (this.editingCell) return;
        document.querySelectorAll('.cell-focus').forEach(c => c.classList.remove('cell-focus'));
        td.classList.add('cell-focus');

        const col = td.dataset.col;
        const rowId = td.dataset.rowId;
        const row = this.data.find(r => r.ID == rowId);
        const colIdx = this.columns.filter(c => c !== 'ID').indexOf(col);

        document.getElementById('cell-ref').textContent = `${String.fromCharCode(65 + (colIdx % 26))}${this.data.indexOf(row) + 1}`;

        const input = document.getElementById('cell-input');
        input.value = row ? (row[col] ?? '') : '';
        input.readOnly = false;
        input.onchange = () => {
            if (row) {
                this.pushUndo(rowId, col, row[col]);
                row[col] = input.value;
                td.textContent = input.value;
                this.saveCell(rowId, col, input.value);
            }
        };

        this.focusedCell = { td, col, rowId };
    },

    // ── Inline edit on double-click ─────────────
    startEdit(event) {
        const td = event.target.closest('td');
        if (!td || !td.dataset.col) return;

        const col = td.dataset.col;
        const rowId = td.dataset.rowId;
        const row = this.data.find(r => r.ID == rowId);
        if (!row) return;

        const oldValue = row[col] ?? '';
        this.pushUndo(rowId, col, oldValue);

        td.classList.add('editing');
        const input = document.createElement('input');
        input.type = 'text';
        input.value = oldValue;
        td.textContent = '';
        td.appendChild(input);
        input.focus();
        input.select();

        this.editingCell = td;

        const finish = () => {
            const newVal = input.value;
            row[col] = newVal;
            td.classList.remove('editing');
            td.textContent = newVal;
            this.editingCell = null;
            this.saveCell(rowId, col, newVal);
        };

        input.addEventListener('blur', finish);
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.value = oldValue; input.blur(); }
            if (e.key === 'Tab') {
                e.preventDefault();
                input.blur();
                // Move to next cell
                const nextTd = e.shiftKey ? td.previousElementSibling : td.nextElementSibling;
                if (nextTd && nextTd.dataset.col) {
                    this.focusCell(nextTd);
                    this.startEditFromCell(nextTd);
                }
            }
        });
    },

    startEditFromCell(td) {
        const event = { target: td };
        this.startEdit(event);
    },

    // ── Save single cell via API ────────────────
    async saveCell(rowId, col, value) {
        const row = this.data.find(r => r.ID == rowId);
        if (!row) return;

        try {
            await fetch(`/api/data/${this.sheet}/${rowId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(row)
            });
            this.dirty = true;
            this.updateSyncIndicator();
        } catch (e) {
            this.notify('Failed to save: ' + e.message, 'error');
        }
    },

    // ── Row selection ───────────────────────────
    toggleRow(id) {
        if (this.selected.has(id)) this.selected.delete(id);
        else this.selected.add(id);
        this.renderGrid();
    },

    selectAll(checked) {
        this.selected.clear();
        if (checked) this.data.forEach(r => this.selected.add(r.ID));
        this.renderGrid();
    },

    // ── Add row ─────────────────────────────────
    addRow() {
        const visibleCols = this.columns.filter(c => c !== 'ID');
        let formHtml = '';

        visibleCols.forEach(col => {
            const fullClass = (col === 'Description' || col === 'Notes') ? ' full' : '';
            const inputType = col.includes('(mm)') || col.includes('(g)') ? 'number' : 'text';
            const isTextarea = col === 'Description' || col === 'Notes';

            formHtml += `<div class="form-group${fullClass}">
                <label for="add-${col}">${col}</label>
                ${isTextarea
                    ? `<textarea id="add-${col}" name="${col}"></textarea>`
                    : `<input type="${inputType}" id="add-${col}" name="${col}" step="any">`
                }
            </div>`;
        });

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.id = 'add-modal';
        modal.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h2>Add New Row — ${this.sheet}</h2>
                    <button class="modal-close" onclick="App.closeModal()">✕</button>
                </div>
                <div class="modal-body">${formHtml}</div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="App.closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="App.submitNewRow()">Add Row</button>
                </div>
            </div>
        `;
        modal.addEventListener('click', e => { if (e.target === modal) this.closeModal(); });
        document.body.appendChild(modal);
    },

    async submitNewRow() {
        const visibleCols = this.columns.filter(c => c !== 'ID');
        const row = {};

        visibleCols.forEach(col => {
            const el = document.getElementById(`add-${col}`);
            if (el) row[col] = el.value;
        });

        try {
            const res = await fetch(`/api/data/${this.sheet}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(row)
            });
            const result = await res.json();
            this.data.push(result.row);
            this.dirty = true;
            this.closeModal();
            this.renderGrid();
            this.notify('Row added successfully', 'success');

            // Scroll to new row
            const wrapper = document.getElementById('grid-wrapper');
            setTimeout(() => {
                wrapper.scrollTop = wrapper.scrollHeight;
                const lastRow = document.querySelector('.grid tbody tr:last-child');
                if (lastRow) lastRow.classList.add('new-row');
            }, 50);
        } catch (e) {
            this.notify('Failed to add: ' + e.message, 'error');
        }
    },

    closeModal() {
        const modal = document.getElementById('add-modal');
        if (modal) modal.remove();
    },

    // ── Delete selected ─────────────────────────
    async deleteSelected() {
        if (this.selected.size === 0) {
            this.notify('Select rows to delete first', 'warning');
            return;
        }
        if (!confirm(`Delete ${this.selected.size} row(s)?`)) return;

        const ids = [...this.selected];
        for (const id of ids) {
            try {
                await fetch(`/api/data/${this.sheet}/${id}`, { method: 'DELETE' });
                this.data = this.data.filter(r => r.ID !== id);
            } catch (e) {
                this.notify(`Failed to delete row ${id}`, 'error');
            }
        }
        this.selected.clear();
        this.dirty = true;
        this.renderGrid();
        this.notify(`Deleted ${ids.length} row(s)`, 'success');
    },

    // ── Undo ────────────────────────────────────
    pushUndo(rowId, col, oldValue) {
        this.undoStack.push({ rowId, col, oldValue, sheet: this.sheet });
        if (this.undoStack.length > 50) this.undoStack.shift();
    },

    async undo() {
        const action = this.undoStack.pop();
        if (!action) { this.notify('Nothing to undo', 'info'); return; }

        if (action.sheet !== this.sheet) {
            await this.switchSheet(action.sheet);
        }

        const row = this.data.find(r => r.ID == action.rowId);
        if (row) {
            row[action.col] = action.oldValue;
            await this.saveCell(action.rowId, action.col, action.oldValue);
            this.renderGrid();
            this.notify(`Undone: ${action.col}`, 'info');
        }
    },

    // ── Sorting ─────────────────────────────────
    sortCol: null,
    sortDir: 'asc',

    sortBy(col) {
        if (this.sortCol === col) {
            this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortCol = col;
            this.sortDir = 'asc';
        }

        this.data.sort((a, b) => {
            let va = a[col] ?? '';
            let vb = b[col] ?? '';
            const na = parseFloat(va);
            const nb = parseFloat(vb);
            if (!isNaN(na) && !isNaN(nb)) {
                return this.sortDir === 'asc' ? na - nb : nb - na;
            }
            va = String(va).toLowerCase();
            vb = String(vb).toLowerCase();
            return this.sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        });

        this.renderGrid();

        // Highlight sorted column
        document.querySelectorAll('.grid thead th').forEach(th => {
            th.classList.remove('sorted-asc', 'sorted-desc');
        });
        const ths = document.querySelectorAll('.grid thead th');
        const idx = this.columns.filter(c => c !== 'ID').indexOf(col) + 1;
        if (ths[idx]) ths[idx].classList.add(this.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
    },

    // ── Sync / Reload ───────────────────────────
    async sync() {
        const btn = document.getElementById('sync-btn');
        const dot = document.querySelector('.status-dot');
        dot.className = 'status-dot saving';
        document.getElementById('status-text').textContent = 'Saving...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/sync', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            this.dirty = false;
            this.notify('✅ ' + data.message, 'success');
            this.updateSyncIndicator();
            document.getElementById('last-sync').textContent = `Last sync: ${new Date().toLocaleTimeString()}`;
        } catch (e) {
            this.notify('Sync failed: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
        }
    },

    async reload() {
        if (this.dirty && !confirm('You have unsaved changes. Reload will discard them. Continue?')) return;

        try {
            const res = await fetch('/api/reload', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            this.dirty = false;
            await this.switchSheet(this.sheet);
            this.notify('🔄 ' + data.message, 'info');
        } catch (e) {
            this.notify('Reload failed: ' + e.message, 'error');
        }
    },

    // ── Export ───────────────────────────────────
    exportExcel() {
        // Trigger sync first, then user can find the Excel in the data folder
        this.sync().then(() => {
            this.notify('📂 Excel saved to: data/CeramicDB-Database.xlsx', 'success');
        });
    },

    // ── Stats ───────────────────────────────────
    async loadStats() {
        try {
            const res = await fetch('/api/stats');
            const stats = await res.json();
            document.getElementById('file-path').textContent = stats.file;
            if (stats.lastSync) {
                document.getElementById('last-sync').textContent = `Last sync: ${new Date(stats.lastSync).toLocaleTimeString()}`;
            }
        } catch (e) { /* ignore */ }
    },

    // ── UI Updates ──────────────────────────────
    updateSyncIndicator() {
        const dot = document.querySelector('.status-dot');
        const text = document.getElementById('status-text');
        if (this.dirty) {
            dot.className = 'status-dot dirty';
            text.textContent = 'Unsaved changes';
        } else {
            dot.className = 'status-dot synced';
            text.textContent = 'Synced';
        }
    },

    updateStatus(dataRes) {
        if (dataRes.lastSync) {
            document.getElementById('last-sync').textContent = `Last sync: ${new Date(dataRes.lastSync).toLocaleTimeString()}`;
        }
    },

    // ── Notifications ───────────────────────────
    notify(msg, type = 'info') {
        let area = document.querySelector('.notification-area');
        if (!area) {
            area = document.createElement('div');
            area.className = 'notification-area';
            document.body.appendChild(area);
        }
        const el = document.createElement('div');
        el.className = `notification notification-${type}`;
        el.textContent = msg;
        area.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 3500);
    },

    escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
};

// Keyboard shortcuts
document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); App.sync(); }
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); App.undo(); }
    if (e.key === 'Delete' && App.selected.size > 0 && !App.editingCell) { App.deleteSelected(); }
});

// Init
document.addEventListener('DOMContentLoaded', () => App.init());
