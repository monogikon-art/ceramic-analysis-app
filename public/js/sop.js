/**
 * CeramicDB — Standard Operating Procedure (SOP) Guide
 */
const SOP = {
    init() {
        const container = document.getElementById('page-sop');
        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-text">
                    <h1>📋 Standard Operating Procedure</h1>
                    <p>How to use CeramicDB — Ceramic Analysis & Elemental Data Processing Platform</p>
                </div>
            </div>

            <div class="sop-container">
                <!-- Table of Contents -->
                <div class="section-card sop-toc">
                    <h2>📑 Table of Contents</h2>
                    <ol class="toc-list">
                        <li><a href="#" onclick="SOP.scrollTo('sop-overview')">Platform Overview</a></li>
                        <li><a href="#" onclick="SOP.scrollTo('sop-getting-started')">Getting Started</a></li>
                        <li><a href="#" onclick="SOP.scrollTo('sop-projects')">Managing Projects</a></li>
                        <li><a href="#" onclick="SOP.scrollTo('sop-samples')">Recording Samples</a></li>
                        <li><a href="#" onclick="SOP.scrollTo('sop-analyses')">Entering Elemental Analyses</a></li>
                        <li><a href="#" onclick="SOP.scrollTo('sop-petrography')">Petrographic Observations</a></li>
                        <li><a href="#" onclick="SOP.scrollTo('sop-fabric')">Fabric Groups</a></li>
                        <li><a href="#" onclick="SOP.scrollTo('sop-processing')">Data Processing & Statistics</a></li>
                        <li><a href="#" onclick="SOP.scrollTo('sop-import-export')">Import & Export</a></li>
                        <li><a href="#" onclick="SOP.scrollTo('sop-best-practices')">Best Practices</a></li>
                    </ol>
                </div>

                <!-- Section 1: Overview -->
                <div class="section-card" id="sop-overview">
                    <h2>1. Platform Overview</h2>
                    <p>CeramicDB is a web-based platform designed for archaeological ceramic research communities.
                    It enables researchers to:</p>
                    <ul class="sop-list">
                        <li><strong>Document ceramic samples</strong> with comprehensive metadata (provenance, morphology, measurements)</li>
                        <li><strong>Record elemental analyses</strong> from XRF, ICP-MS, NAA, SEM-EDS, and other analytical techniques</li>
                        <li><strong>Manage petrographic observations</strong> with thin-section descriptions and microphotograph uploads</li>
                        <li><strong>Define and share fabric groups</strong> across projects and institutions</li>
                        <li><strong>Process and visualize data</strong> with built-in statistics, correlation matrices, and charts</li>
                        <li><strong>Import/Export data</strong> via standardized Excel templates</li>
                    </ul>
                    <div class="sop-note info">
                        <strong>💡 Designed for Universities:</strong> CeramicDB supports multi-user collaboration,
                        allowing research teams across institutions to share fabric groups, samples, and analytical databases.
                    </div>
                </div>

                <!-- Section 2: Getting Started -->
                <div class="section-card" id="sop-getting-started">
                    <h2>2. Getting Started</h2>
                    <h3>2.1 Creating an Account</h3>
                    <ol class="sop-steps">
                        <li>Click <strong>"Register"</strong> on the login screen</li>
                        <li>Fill in your name, email, university, and department</li>
                        <li>Choose a password (minimum 6 characters)</li>
                        <li>Click <strong>"Create Account"</strong></li>
                    </ol>
                    <h3>2.2 Signing In</h3>
                    <ol class="sop-steps">
                        <li>Enter your registered email address</li>
                        <li>Enter your password</li>
                        <li>Click <strong>"Sign In"</strong></li>
                    </ol>
                    <h3>2.3 Navigation</h3>
                    <p>Use the sidebar on the left to navigate between modules:</p>
                    <table class="sop-table">
                        <thead><tr><th>Module</th><th>Purpose</th></tr></thead>
                        <tbody>
                            <tr><td>📊 Dashboard</td><td>Overview stats, recent activity, charts</td></tr>
                            <tr><td>🏺 Samples</td><td>Register and manage ceramic samples</td></tr>
                            <tr><td>🔬 Analyses</td><td>Record elemental composition data</td></tr>
                            <tr><td>🔍 Petrography</td><td>Thin-section observations and microphotos</td></tr>
                            <tr><td>📈 Data Processing</td><td>Statistics, correlations, export</td></tr>
                            <tr><td>📁 Projects</td><td>Organize work into research projects</td></tr>
                            <tr><td>🧱 Fabric Groups</td><td>Define petrographic fabric classifications</td></tr>
                            <tr><td>📥 Import / Export</td><td>Bulk data via Excel templates</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Section 3: Projects -->
                <div class="section-card" id="sop-projects">
                    <h2>3. Managing Projects</h2>
                    <p>Projects organize your research. Every sample should belong to a project.</p>
                    <h3>3.1 Creating a Project</h3>
                    <ol class="sop-steps">
                        <li>Navigate to <strong>Projects</strong> from the sidebar</li>
                        <li>Click <strong>"New Project"</strong></li>
                        <li>Fill in: Project name, description, PI, university, funding source, dates</li>
                        <li>Click <strong>"Save"</strong></li>
                    </ol>
                    <div class="sop-note tip">
                        <strong>💡 Tip:</strong> Use descriptive project names that include the region and period,
                        e.g., "Cyprus LBA Pottery Provenance Study 2025"
                    </div>
                </div>

                <!-- Section 4: Samples -->
                <div class="section-card" id="sop-samples">
                    <h2>4. Recording Samples</h2>
                    <p>Each ceramic sherd or vessel is registered as a sample with a unique code.</p>
                    <h3>4.1 Adding a Sample</h3>
                    <ol class="sop-steps">
                        <li>Go to <strong>Samples</strong> → click <strong>"Add Sample"</strong></li>
                        <li>Enter the <strong>Sample Code</strong> (required, must be unique) — e.g., CYP-2025-001</li>
                        <li>Assign to a <strong>Project</strong></li>
                        <li>Fill in provenance data: site name, trench, locus, stratigraphy</li>
                        <li>Add temporal data: period, chronology, dating method</li>
                        <li>Record typology: ceramic type, vessel form, vessel part, decoration</li>
                        <li>Add measurements: thickness, weight, length, diameters</li>
                        <li>Optionally assign a <strong>Fabric Group</strong></li>
                        <li>Click <strong>"Save"</strong></li>
                    </ol>
                    <div class="sop-note warning">
                        <strong>⚠️ Sample Code Convention:</strong> Use a consistent coding scheme across your project.
                        Recommended: <code>[SITE]-[YEAR]-[NUMBER]</code> e.g., ENK-2025-001
                    </div>
                </div>

                <!-- Section 5: Analyses -->
                <div class="section-card" id="sop-analyses">
                    <h2>5. Entering Elemental Analyses</h2>
                    <p>Record the results of compositional analysis (XRF, ICP-MS, NAA, etc.).</p>
                    <h3>5.1 Adding an Analysis</h3>
                    <ol class="sop-steps">
                        <li>Go to <strong>Analyses</strong> → click <strong>"New Analysis"</strong></li>
                        <li>Select the <strong>Sample</strong> this analysis belongs to</li>
                        <li>Choose the <strong>Method</strong>: XRF, pXRF, ICP-MS, ICP-OES, LA-ICP-MS, NAA, SEM-EDS, PIXE</li>
                        <li>Enter laboratory, analyst, and analysis date</li>
                        <li>Enter element concentrations in the grid:
                            <ul>
                                <li><strong>Major oxides</strong> (wt%): SiO2, Al2O3, Fe2O3, CaO, MgO, Na2O, K2O, TiO2, P2O5, MnO</li>
                                <li><strong>Trace elements</strong> (ppm): Cr, Ni, V, Co, Rb, Sr, Zr, Ba, etc.</li>
                            </ul>
                        </li>
                        <li>Click <strong>"Save"</strong></li>
                    </ol>
                    <div class="sop-note info">
                        <strong>💡 Units:</strong> Major oxides should be entered in weight percent (wt%).
                        Trace elements should be entered in parts per million (ppm).
                    </div>
                </div>

                <!-- Section 6: Petrography -->
                <div class="section-card" id="sop-petrography">
                    <h2>6. Petrographic Observations</h2>
                    <p>Record thin-section petrographic descriptions and upload microphotographs.</p>
                    <h3>6.1 Adding an Observation</h3>
                    <ol class="sop-steps">
                        <li>Go to <strong>Petrography</strong> → click <strong>"New Observation"</strong></li>
                        <li>Select the <strong>Sample</strong> and assign a <strong>Fabric Group</strong></li>
                        <li>Describe the <strong>Matrix</strong>: optical activity, color in PPL/XPL</li>
                        <li>Record <strong>Inclusions</strong>: types, frequency, grain size, sorting, roundness</li>
                        <li>Describe <strong>Voids</strong> and estimate <strong>Firing Temperature</strong></li>
                        <li>Click <strong>"Save"</strong></li>
                    </ol>
                    <h3>6.2 Uploading Microphotographs</h3>
                    <ol class="sop-steps">
                        <li>Open an existing observation</li>
                        <li>Click <strong>"Upload Microphotograph"</strong></li>
                        <li>Select the image type: PPL, XPL, Reflected, or Other</li>
                        <li>Enter magnification and optional caption</li>
                        <li>Choose the image file (JPG, PNG, TIFF, BMP — max 20MB)</li>
                    </ol>
                </div>

                <!-- Section 7: Fabric Groups -->
                <div class="section-card" id="sop-fabric">
                    <h2>7. Fabric Groups</h2>
                    <p>Fabric groups classify ceramics by their petrographic characteristics.
                    They are <strong>shared across all projects</strong>, enabling cross-project comparisons.</p>
                    <h3>7.1 Creating a Fabric Group</h3>
                    <ol class="sop-steps">
                        <li>Go to <strong>Fabric Groups</strong> → click <strong>"New Fabric Group"</strong></li>
                        <li>Enter a <strong>Name</strong> (e.g., "Troodos Ophiolite Igneous") and <strong>Code</strong> (e.g., "TOI")</li>
                        <li>Describe key characteristics, typical inclusions, color range, firing range</li>
                        <li>Optionally specify the <strong>Region</strong> (e.g., "Cyprus — Troodos Ophiolite")</li>
                    </ol>
                    <div class="sop-note tip">
                        <strong>💡 Pre-loaded Fabrics:</strong> CeramicDB comes with 22 pre-defined fabric groups
                        including 12 Cyprus-specific fabrics from the Troodos, Mammonia, Mesaoria, and Kyrenia geological zones.
                    </div>
                </div>

                <!-- Section 8: Data Processing -->
                <div class="section-card" id="sop-processing">
                    <h2>8. Data Processing & Statistics</h2>
                    <p>The Data Processing module provides analytical tools for your compositional data.</p>
                    <h3>Available Features:</h3>
                    <table class="sop-table">
                        <thead><tr><th>Feature</th><th>Description</th></tr></thead>
                        <tbody>
                            <tr><td><strong>Summary Statistics</strong></td><td>Mean, median, std. dev., CV for each element — filterable by project/fabric</td></tr>
                            <tr><td><strong>Composition Matrix</strong></td><td>Pivot table: samples × elements — ready for multivariate analysis</td></tr>
                            <tr><td><strong>Correlation Matrix</strong></td><td>Pearson correlation coefficients between elements</td></tr>
                            <tr><td><strong>Charts</strong></td><td>Bar charts, scatter plots to visualize distributions</td></tr>
                            <tr><td><strong>Export</strong></td><td>Download data as CSV or Excel for external tools (R, SPSS)</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Section 9: Import/Export -->
                <div class="section-card" id="sop-import-export">
                    <h2>9. Import & Export</h2>
                    <h3>9.1 Importing Data from Excel</h3>
                    <ol class="sop-steps">
                        <li>Go to <strong>Import / Export</strong></li>
                        <li>Download the appropriate <strong>template</strong> (Samples, Analyses, Fabric Groups, or All-in-One)</li>
                        <li>Open in Excel and fill in your data following the column headers</li>
                        <li>Fields marked with <strong>*</strong> are required</li>
                        <li>Save the file as .xlsx</li>
                        <li>Upload the file using the drag-and-drop area or file selector</li>
                        <li>Review the import results — any errors will be listed</li>
                    </ol>
                    <div class="sop-note warning">
                        <strong>⚠️ Important:</strong> For Analyses import, the sample must already exist in CeramicDB.
                        Import samples first, then import analyses. The system matches by <code>sample_code</code>.
                    </div>
                    <h3>9.2 Exporting Data</h3>
                    <ol class="sop-steps">
                        <li>Go to <strong>Import / Export</strong></li>
                        <li>Click <strong>"Export All Data (.xlsx)"</strong> for a multi-sheet Excel workbook</li>
                        <li>Or click <strong>"Export as CSV"</strong> for a flat composition matrix</li>
                    </ol>
                </div>

                <!-- Section 10: Best Practices -->
                <div class="section-card" id="sop-best-practices">
                    <h2>10. Best Practices</h2>
                    <div class="best-practices-grid">
                        <div class="best-practice">
                            <h3>🏷️ Consistent Naming</h3>
                            <p>Use standardized sample codes, site abbreviations, and period terminology across your project.</p>
                        </div>
                        <div class="best-practice">
                            <h3>📐 Quality Control</h3>
                            <p>Always include reference materials in your analyses. Record calibration and quality notes.</p>
                        </div>
                        <div class="best-practice">
                            <h3>🔄 Regular Exports</h3>
                            <p>Periodically export your data as backup. Use the Excel export for archiving.</p>
                        </div>
                        <div class="best-practice">
                            <h3>🏛️ Collaborate</h3>
                            <p>Share fabric group definitions across projects. Use consistent geological zone naming.</p>
                        </div>
                        <div class="best-practice">
                            <h3>📋 Complete Records</h3>
                            <p>Fill in as many fields as possible. Rich metadata improves provenance determination.</p>
                        </div>
                        <div class="best-practice">
                            <h3>📸 Document Visually</h3>
                            <p>Upload PPL and XPL microphotographs for every thin-section observation.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    scrollTo(id) {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};
