/**
 * CeramicDB — Import / Export Module
 * Template downloads, Excel uploads, and full data export
 */
const ImportExport = {
    init() {
        const container = document.getElementById('page-import-export');
        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-text">
                    <h1>📥 Import / Export</h1>
                    <p>Upload data from Excel or download templates and exports</p>
                </div>
            </div>

            <!-- Download Templates -->
            <div class="section-card">
                <h2>📄 Download Templates</h2>
                <p style="color: var(--text-muted); margin-bottom: 1.2rem;">
                    Download pre-formatted Excel templates, fill in your data, and upload them to import records into CeramicDB.
                </p>
                <div class="template-grid">
                    <div class="template-card" onclick="ImportExport.downloadTemplate('samples')">
                        <div class="template-icon">🏺</div>
                        <h3>Samples Template</h3>
                        <p>36 fields including site, period, vessel form, measurements</p>
                        <span class="btn btn-outline btn-sm">Download .xlsx</span>
                    </div>
                    <div class="template-card" onclick="ImportExport.downloadTemplate('analyses')">
                        <div class="template-icon">🔬</div>
                        <h3>Analyses Template</h3>
                        <p>Elemental analysis with 10 major oxides + 19 trace elements</p>
                        <span class="btn btn-outline btn-sm">Download .xlsx</span>
                    </div>
                    <div class="template-card" onclick="ImportExport.downloadTemplate('fabric-groups')">
                        <div class="template-icon">🧱</div>
                        <h3>Fabric Groups Template</h3>
                        <p>8 fields: name, code, description, inclusions, region, etc.</p>
                        <span class="btn btn-outline btn-sm">Download .xlsx</span>
                    </div>
                    <div class="template-card highlight" onclick="ImportExport.downloadTemplate('all')">
                        <div class="template-icon">📦</div>
                        <h3>All-in-One Template</h3>
                        <p>Multi-sheet workbook with all three templates combined</p>
                        <span class="btn btn-primary btn-sm">Download .xlsx</span>
                    </div>
                </div>
            </div>

            <!-- Upload Data -->
            <div class="section-card">
                <h2>📤 Upload Data</h2>
                <p style="color: var(--text-muted); margin-bottom: 1.2rem;">
                    Upload a filled Excel template. The system will automatically detect which sheets are present
                    (Samples, Analyses, Fabric Groups) and import the data. Existing records with duplicate keys will be skipped.
                </p>
                <div class="upload-zone" id="upload-zone" onclick="document.getElementById('upload-input').click()">
                    <div class="upload-icon">📁</div>
                    <p class="upload-text">Click to select an Excel file or drag & drop here</p>
                    <p class="upload-hint">.xlsx files only, max 10MB</p>
                    <input type="file" id="upload-input" accept=".xlsx,.xls" style="display:none" onchange="ImportExport.handleUpload(event)">
                </div>
                <div id="upload-progress" style="display:none" class="upload-progress">
                    <div class="spinner"></div>
                    <span>Processing your file...</span>
                </div>
                <div id="upload-results" style="display:none" class="upload-results"></div>
            </div>

            <!-- Export Data -->
            <div class="section-card">
                <h2>📊 Export Data</h2>
                <p style="color: var(--text-muted); margin-bottom: 1.2rem;">
                    Export all your CeramicDB data as a multi-sheet Excel workbook.
                    Includes Samples, Composition Matrix, Fabric Groups, and Projects.
                </p>
                <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="ImportExport.exportAll()">
                        📊 Export All Data (.xlsx)
                    </button>
                    <button class="btn btn-outline" onclick="ImportExport.exportCSV()">
                        📄 Export as CSV
                    </button>
                </div>
            </div>
        `;

        // Drag and drop
        const zone = document.getElementById('upload-zone');
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file) ImportExport.processFile(file);
        });
    },

    downloadTemplate(type) {
        window.location.href = `/api/import-export/template/${type}`;
    },

    handleUpload(event) {
        const file = event.target.files[0];
        if (file) this.processFile(file);
    },

    async processFile(file) {
        const progress = document.getElementById('upload-progress');
        const results = document.getElementById('upload-results');
        progress.style.display = 'flex';
        results.style.display = 'none';

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/import-export/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Upload failed');

            let html = `
                <div class="result-summary success">
                    <h3>✅ ${data.message}</h3>
                </div>
            `;

            if (data.results.errors.length > 0) {
                html += `
                    <div class="result-summary warning">
                        <h4>⚠️ ${data.results.errors.length} issue(s):</h4>
                        <ul>${data.results.errors.map(e => `<li>${e}</li>`).join('')}</ul>
                    </div>
                `;
            }

            results.innerHTML = html;
            results.style.display = 'block';
            App.notify('Import completed successfully', 'success');
        } catch (e) {
            results.innerHTML = `<div class="result-summary error"><h3>❌ Error: ${e.message}</h3></div>`;
            results.style.display = 'block';
            App.notify('Import failed: ' + e.message, 'error');
        } finally {
            progress.style.display = 'none';
            document.getElementById('upload-input').value = '';
        }
    },

    exportAll() {
        window.location.href = '/api/import-export/export';
        App.notify('Export download started', 'success');
    },

    exportCSV() {
        window.location.href = '/api/processing/export?format=csv';
        App.notify('CSV export started', 'success');
    }
};
