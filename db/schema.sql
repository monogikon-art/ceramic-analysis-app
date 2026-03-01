-- CeramicDB Schema
-- Ceramic Analysis & Elemental Data Processing

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    university TEXT,
    department TEXT,
    role TEXT DEFAULT 'researcher' CHECK(role IN ('admin', 'researcher', 'viewer')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PROJECTS
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    principal_investigator TEXT,
    university TEXT,
    funding_source TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'archived')),
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK(role IN ('lead', 'member', 'viewer')),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

-- ============================================
-- CERAMIC SAMPLES
-- ============================================
CREATE TABLE IF NOT EXISTS samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    sample_code TEXT NOT NULL UNIQUE,
    
    -- Site & Context
    site_name TEXT,
    site_code TEXT,
    excavation_context TEXT,
    stratigraphic_unit TEXT,
    trench TEXT,
    locus TEXT,
    
    -- Chronology
    period TEXT,
    chronology TEXT,
    dating_method TEXT,
    
    -- Ceramic Description
    ceramic_type TEXT,
    vessel_form TEXT,
    vessel_part TEXT,
    decoration TEXT,
    surface_treatment TEXT,
    
    -- Physical Properties
    fabric_group_id INTEGER REFERENCES fabric_groups(id) ON DELETE SET NULL,
    color TEXT,
    munsell_code TEXT,
    firing TEXT,
    hardness TEXT,
    
    -- Dimensions & Measurements
    length_mm REAL,
    width_mm REAL,
    thickness_mm REAL,
    weight_g REAL,
    rim_diameter_mm REAL,
    base_diameter_mm REAL,
    
    -- Condition & Conservation
    condition TEXT,
    completeness TEXT,
    
    -- Location
    latitude REAL,
    longitude REAL,
    elevation REAL,
    
    -- Collection
    collected_by TEXT,
    collection_date DATE,
    current_location TEXT,
    
    -- Notes
    description TEXT,
    notes TEXT,
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- FABRIC GROUPS (Global / Shared across projects)
-- ============================================
CREATE TABLE IF NOT EXISTS fabric_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE,
    description TEXT,
    key_characteristics TEXT,
    typical_inclusions TEXT,
    color_range TEXT,
    firing_range TEXT,
    region TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ANALYSES
-- ============================================
CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    
    -- Method
    method TEXT NOT NULL CHECK(method IN (
        'XRF', 'pXRF', 'ICP-MS', 'ICP-OES', 'LA-ICP-MS',
        'NAA', 'SEM-EDS', 'PIXE', 'Other'
    )),
    
    -- Lab & Instrument
    laboratory TEXT,
    instrument TEXT,
    instrument_settings TEXT,
    
    -- Personnel & Dates
    analyst TEXT,
    analysis_date DATE,
    
    -- Quality
    reference_materials TEXT,
    calibration_notes TEXT,
    quality_notes TEXT,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ELEMENTAL DATA
-- ============================================
CREATE TABLE IF NOT EXISTS elemental_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    analysis_id INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    
    element TEXT NOT NULL,           -- e.g. 'SiO2', 'Rb', 'Sr'
    value REAL,                       -- concentration value
    unit TEXT DEFAULT 'wt%' CHECK(unit IN ('wt%', 'ppm', 'ppb')),
    error_value REAL,                 -- measurement uncertainty
    error_type TEXT DEFAULT 'absolute' CHECK(error_type IN ('absolute', 'relative', '1sigma', '2sigma')),
    detection_limit REAL,
    is_below_detection INTEGER DEFAULT 0,
    
    UNIQUE(analysis_id, element)
);

-- ============================================
-- PETROGRAPHY
-- ============================================
CREATE TABLE IF NOT EXISTS petrography (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    fabric_group_id INTEGER REFERENCES fabric_groups(id) ON DELETE SET NULL,
    
    -- Matrix
    matrix_description TEXT,
    optical_activity TEXT CHECK(optical_activity IN (
        'Active', 'Slightly active', 'Inactive', NULL
    )),
    matrix_color_ppl TEXT,
    matrix_color_xpl TEXT,
    
    -- Inclusions
    inclusion_types TEXT,             -- JSON array or comma-separated
    inclusion_frequency TEXT CHECK(inclusion_frequency IN (
        '<5%', '5-10%', '10-20%', '20-30%', '>30%', NULL
    )),
    dominant_grain_size TEXT CHECK(dominant_grain_size IN (
        'Very fine (<0.1mm)', 'Fine (0.1-0.25mm)', 'Medium (0.25-0.5mm)',
        'Coarse (0.5-1mm)', 'Very coarse (>1mm)', NULL
    )),
    max_grain_size_mm REAL,
    sorting TEXT CHECK(sorting IN (
        'Well sorted', 'Moderately sorted', 'Poorly sorted', NULL
    )),
    roundness TEXT CHECK(roundness IN (
        'Angular', 'Sub-angular', 'Sub-rounded', 'Rounded', 'Well-rounded', NULL
    )),
    
    -- Voids
    void_description TEXT,
    void_frequency TEXT,
    
    -- Technology
    estimated_firing_temp TEXT CHECK(estimated_firing_temp IN (
        '<700°C', '700-800°C', '800-900°C', '900-1000°C', '>1000°C', NULL
    )),
    forming_technique TEXT,
    
    -- Notes
    analyst TEXT,
    analysis_date DATE,
    notes TEXT,
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MICROPHOTOGRAPHS
-- ============================================
CREATE TABLE IF NOT EXISTS microphotos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    petrography_id INTEGER NOT NULL REFERENCES petrography(id) ON DELETE CASCADE,
    
    file_path TEXT NOT NULL,
    original_filename TEXT,
    image_type TEXT NOT NULL CHECK(image_type IN ('PPL', 'XPL', 'Reflected', 'Other')),
    magnification TEXT,
    caption TEXT,
    
    uploaded_by INTEGER REFERENCES users(id),
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PROVENANCE
-- ============================================
CREATE TABLE IF NOT EXISTS provenance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    
    proposed_origin TEXT,
    confidence TEXT CHECK(confidence IN ('High', 'Medium', 'Low', 'Tentative')),
    method_basis TEXT,               -- what analyses support this
    reference_group TEXT,
    notes TEXT,
    
    assigned_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LITERATURE REFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS refs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    citation TEXT NOT NULL,
    authors TEXT,
    year INTEGER,
    title TEXT,
    journal TEXT,
    doi TEXT,
    url TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sample_refs (
    sample_id INTEGER NOT NULL REFERENCES samples(id) ON DELETE CASCADE,
    ref_id INTEGER NOT NULL REFERENCES refs(id) ON DELETE CASCADE,
    PRIMARY KEY (sample_id, ref_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_samples_project ON samples(project_id);
CREATE INDEX IF NOT EXISTS idx_samples_site ON samples(site_name);
CREATE INDEX IF NOT EXISTS idx_samples_period ON samples(period);
CREATE INDEX IF NOT EXISTS idx_samples_fabric ON samples(fabric_group_id);
CREATE INDEX IF NOT EXISTS idx_samples_code ON samples(sample_code);
CREATE INDEX IF NOT EXISTS idx_analyses_sample ON analyses(sample_id);
CREATE INDEX IF NOT EXISTS idx_analyses_method ON analyses(method);
CREATE INDEX IF NOT EXISTS idx_elemental_analysis ON elemental_data(analysis_id);
CREATE INDEX IF NOT EXISTS idx_elemental_element ON elemental_data(element);
CREATE INDEX IF NOT EXISTS idx_petrography_sample ON petrography(sample_id);
CREATE INDEX IF NOT EXISTS idx_petrography_fabric ON petrography(fabric_group_id);
CREATE INDEX IF NOT EXISTS idx_microphotos_petro ON microphotos(petrography_id);
