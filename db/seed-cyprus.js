const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ceramicdb.sqlite');

async function seedCyprus() {
    console.log('🇨🇾 Seeding Cyprus data...');
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);

    const adminRes = db.exec("SELECT id FROM users WHERE email = 'admin@ceramicdb.local'");
    const adminId = adminRes[0].values[0][0];

    function lastId() { return db.exec("SELECT last_insert_rowid()")[0].values[0][0]; }

    // ========== CYPRUS FABRIC GROUPS ==========
    const cyprusFabrics = [
        // Troodos Ophiolite
        ['Troodos Ophiolite Igneous', 'TOI', 'Fabric with mafic/ultramafic rock fragments from the Troodos ophiolite complex',
            'Diabase, gabbro, and serpentinite fragments; high Cr and Ni values', 'Pyroxene, olivine, serpentinite, chromite, diabase, plagioclase',
            'Dark brown to greenish-brown', '800-1000°C', 'Cyprus — Troodos Ophiolite'],
        ['Troodos Pillow Lava', 'TPL', 'Fabric containing altered pillow lava fragments typical of the upper Troodos sequence',
            'Altered basalt, zeolites, epidote, chlorite; moderate Fe and Mg', 'Altered basalt, epidote, chlorite, zeolite, quartz',
            'Reddish-brown to grey', '750-950°C', 'Cyprus — Troodos Ophiolite'],
        ['Troodos Ultrabasic', 'TUB', 'Fabric rich in ultrabasic rock fragments from the Troodos harzburgite-dunite core',
            'Serpentinised harzburgite, dunite fragments; very high Cr, Ni, MgO', 'Serpentinite, chromite, olivine, orthopyroxene, magnetite',
            'Dark greenish-grey to black', '800-950°C', 'Cyprus — Troodos Ophiolite'],

        // Sedimentary Circum-Troodos
        ['Circum-Troodos Calcareous', 'CTC', 'Calcareous fabric from the sedimentary formations surrounding the Troodos massif',
            'Chalk, marl, and limestone fragments with foraminifera; high CaO', 'Chalk, marl, limestone, foraminifera, radiolarian chert',
            'Cream to pale yellow', '<850°C', 'Cyprus — Circum-Troodos Sedimentary'],
        ['Circum-Troodos Chalky Marl', 'CTM', 'Fabric from Lefkara/Pakhna chalky marl formations',
            'Micritic calcite, bioclasts, clay pellets; moderate CaO and SiO2', 'Micritic limestone, clay pellets, bioclasts, rare quartz',
            'Buff to pale greenish', '<800°C', 'Cyprus — Circum-Troodos Sedimentary'],
        ['Circum-Troodos Chert-Rich', 'CTCH', 'Fabric with radiolarian chert from the Perapedhi/Kannaviou formations',
            'Angular chert fragments, radiolaria ghosts; elevated SiO2', 'Radiolarian chert, chalcedony, rare volcanic fragments',
            'Brown to reddish-brown', '800-950°C', 'Cyprus — Circum-Troodos Sedimentary'],

        // Mammonia Complex
        ['Mammonia Terrigenous', 'MAT', 'Fabric derived from Mammonia complex terrigenous sediments (SW Cyprus)',
            'Sandstone, siltstone, mudstone, and radiolarite fragments', 'Quartz, feldspar, mica, sandstone, radiolarite, rare serpentinite',
            'Brown to dark reddish-brown', '800-1000°C', 'Cyprus — Mammonia Complex'],
        ['Mammonia Volcanic', 'MAV', 'Fabric with Mammonia extrusive volcanic components (altered lavas, tuffs)',
            'Altered volcanic glass, tuff, bentonitic clay', 'Volcanic glass, tuff, bentonite, feldspar, clinopyroxene',
            'Greenish-brown to grey', '750-900°C', 'Cyprus — Mammonia Complex'],

        // Eastern Coast / Mesaoria
        ['Eastern Calcareous Alluvial', 'ECA', 'Calcareous alluvial fabric from the Mesaoria plain and eastern coastal deposits',
            'Well-rounded calcareous grains, bioclastic sand, terra rossa clay', 'Limestone, calcarenite, bioclasts, quartz sand, iron oxides',
            'Pink to light reddish-brown', '800-900°C', 'Cyprus — Eastern Coast / Mesaoria'],
        ['Eastern Havara', 'EHV', 'Fabric from havara (caliche/calcrete) deposits of the eastern coast',
            'Calcrete fragments, micritic nodules, secondary calcite', 'Calcrete, micritic calcite, quartz, rare chert',
            'White to pale buff', '<800°C', 'Cyprus — Eastern Coast'],

        // Kyrenia Range
        ['Kyrenia Limestone', 'KRL', 'Fabric from the Kyrenia Range recrystallized limestones (Hilarion/Kantara formations)',
            'Sparry and micritic limestone, marble fragments; very high CaO', 'Recrystallised limestone, marble, calcite veins, rare quartz',
            'White to cream', '<850°C', 'Cyprus — Kyrenia Range'],
        ['Kyrenia Flysch', 'KRF', 'Fabric from the Kythrea flysch formation of the northern Kyrenia foothills',
            'Alternating sandstone/mudstone clasts, turbidite textures', 'Quartz, feldspar, lithic sandstone, mudstone, mica, glauconite',
            'Greenish-grey to brown', '800-950°C', 'Cyprus — Kyrenia Range'],
    ];

    for (const fg of cyprusFabrics) {
        db.run(`INSERT INTO fabric_groups (name, code, description, key_characteristics, typical_inclusions, color_range, firing_range, region) VALUES (?,?,?,?,?,?,?,?)`, fg);
    }
    console.log(`✅ Seeded ${cyprusFabrics.length} Cyprus fabric groups`);

    // Get fabric group IDs by code
    function fgId(code) {
        const r = db.exec(`SELECT id FROM fabric_groups WHERE code = '${code}'`);
        return r[0]?.values[0]?.[0] || null;
    }

    // ========== CYPRUS PROJECTS ==========
    db.run(`INSERT INTO projects (name, description, principal_investigator, university, funding_source, start_date, status, created_by) VALUES (?,?,?,?,?,?,?,?)`,
        ['Cyprus Late Bronze Age Provenance', 'Multi-analytical provenance study of Late Cypriot pottery integrating petrographic and chemical data with the geological formations of Cyprus',
            'Dr. Elena Georgiou', 'University of Cyprus', 'Cyprus Research & Innovation Foundation', '2024-09-01', 'active', adminId]);
    const proj1Id = lastId();

    db.run(`INSERT INTO projects (name, description, principal_investigator, university, funding_source, start_date, status, created_by) VALUES (?,?,?,?,?,?,?,?)`,
        ['Paphos District Ceramic Production', 'Investigation of ceramic production centres in the Paphos district and their relationship to the Mammonia and Troodos geological terranes',
            'Dr. Andreas Kakoulli', 'University of Cyprus', 'A.G. Leventis Foundation', '2025-03-01', 'active', adminId]);
    const proj2Id = lastId();
    console.log('✅ Seeded 2 Cyprus projects');

    // ========== CYPRUS SAMPLES ==========
    const cyprusSamples = [
        // Project 1 — LC Provenance (various sites)
        [proj1Id, 'CYP-001', 'Enkomi', 'ENK', 'Area III, Building 18', 'Floor 2, Room A', 'Late Bronze Age', 'LC IIC (c. 1300 BCE)', 'Fine ware', 'Base Ring II jug', 'Complete vessel', 'Grey', '10YR 5/1', 5.8, 145.0, fgId('TOI'), adminId],
        [proj1Id, 'CYP-002', 'Enkomi', 'ENK', 'Area III, Building 18', 'Floor 2, Room B', 'Late Bronze Age', 'LC IIC (c. 1300 BCE)', 'Cooking pot', 'Cooking jug', 'Body sherd', 'Dark reddish-brown', '2.5YR 4/4', 9.4, 38.2, fgId('TOI'), adminId],
        [proj1Id, 'CYP-003', 'Hala Sultan Tekke', 'HST', 'Area A, Well 5', 'Fill layer', 'Late Bronze Age', 'LC IIC (c. 1250 BCE)', 'Transport', 'Canaanite jar', 'Shoulder fragment', 'Buff', '10YR 7/3', 11.2, 52.1, fgId('CTC'), adminId],
        [proj1Id, 'CYP-004', 'Hala Sultan Tekke', 'HST', 'Area 6W, Room 2', 'Floor deposit', 'Late Bronze Age', 'LC IIIA (c. 1200 BCE)', 'Fine ware', 'White Slip II bowl', 'Rim sherd', 'Cream', '2.5Y 8/2', 6.1, 24.7, fgId('CTM'), adminId],
        [proj1Id, 'CYP-005', 'Kition', 'KIT', 'Temple 1, Bothros 9', 'Ritual deposit', 'Late Bronze Age', 'LC IIC (c. 1300 BCE)', 'Fine ware', 'White Painted WM jug', 'Complete profile', 'Pale yellow', '2.5Y 8/3', 5.2, 89.5, fgId('CTC'), adminId],
        [proj1Id, 'CYP-006', 'Kition', 'KIT', 'Area II, Floor IV', 'Destruction layer', 'Late Bronze Age', 'LC IIIA (c. 1190 BCE)', 'Storage jar', 'Pithos', 'Rim + shoulder', 'Light red', '2.5YR 6/6', 14.5, 112.3, fgId('ECA'), adminId],
        [proj1Id, 'CYP-007', 'Alassa-Pano Mandilaris', 'ALA', 'Building II', 'Room 3, Floor', 'Late Bronze Age', 'LC IIC (c. 1250 BCE)', 'Cooking pot', 'Flat-bottom pot', 'Base sherd', 'Dark brown', '7.5YR 4/2', 10.8, 45.6, fgId('TPL'), adminId],
        [proj1Id, 'CYP-008', 'Kalavasos-Ayios Dhimitrios', 'KAD', 'Building X, Room A2', 'Floor deposit', 'Late Bronze Age', 'LC IIC (c. 1300 BCE)', 'Pithos', 'Storage pithos', 'Wall sherd', 'Reddish-brown', '5YR 5/4', 18.5, 156.0, fgId('CTCH'), adminId],

        // Project 2 — Paphos production
        [proj2Id, 'PAP-001', 'Kouklia-Palaepaphos', 'KPP', 'Sanctuary of Aphrodite', 'Fill layer 3', 'Iron Age', 'CG III (c. 700 BCE)', 'Fine ware', 'Bichrome jug', 'Handle + body', 'Pink', '7.5YR 7/4', 6.5, 33.8, fgId('MAT'), adminId],
        [proj2Id, 'PAP-002', 'Kouklia-Palaepaphos', 'KPP', 'Marcello Tomb 9', 'Burial deposit', 'Iron Age', 'CG I (c. 1050 BCE)', 'Fine ware', 'Proto-WP amphora', 'Complete vessel', 'Buff', '10YR 7/4', 5.9, 210.0, fgId('MAV'), adminId],
        [proj2Id, 'PAP-003', 'Lemba-Lakkous', 'LEM', 'Structure 1A, Floor', 'Floor deposit', 'Chalcolithic', 'Middle Chalcolithic (c. 3000 BCE)', 'Coarse ware', 'Red-on-White bowl', 'Rim sherd', 'Red', '2.5YR 5/6', 8.7, 28.4, fgId('MAT'), adminId],
        [proj2Id, 'PAP-004', 'Kissonerga-Mosphilia', 'KIS', 'Period 4, Building 3', 'Destruction layer', 'Chalcolithic', 'Late Chalcolithic (c. 2500 BCE)', 'Coarse ware', 'Storage jar', 'Body sherd', 'Brown', '7.5YR 5/4', 12.3, 41.5, fgId('MAV'), adminId],
        [proj2Id, 'PAP-005', 'Peyia-Koudounas', 'PEY', 'Trench B, Layer 2', 'Midden deposit', 'Late Bronze Age', 'LC I (c. 1600 BCE)', 'Cooking pot', 'Handmade pot', 'Dark grey', '7.5YR 4/1', 11.0, 55.2, fgId('TUB'), adminId],
        [proj2Id, 'PAP-006', 'Kouklia-Evreti', 'KPE', 'Workshop area, Floor', 'Production debris', 'Iron Age', 'CA I (c. 600 BCE)', 'Plain ware', 'Amphora', 'Base sherd', 'Light reddish-brown', '5YR 6/4', 8.9, 35.9, fgId('CTM'), adminId],
        [proj2Id, 'PAP-007', 'Geroskipou', 'GER', 'Tomb 15', 'Burial assemblage', 'Iron Age', 'CG II (c. 900 BCE)', 'Fine ware', 'Black Slip jug', 'Complete', 'Black', '7.5YR 2.5/1', 4.8, 165.0, fgId('KRL'), adminId],
    ];

    for (const s of cyprusSamples) {
        db.run(`INSERT INTO samples (project_id, sample_code, site_name, site_code, excavation_context, stratigraphic_unit,
                period, chronology, ceramic_type, vessel_form, vessel_part, color, munsell_code,
                thickness_mm, weight_g, fabric_group_id, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, s);
    }
    console.log(`✅ Seeded ${cyprusSamples.length} Cyprus ceramic samples`);

    // ========== ELEMENTAL ANALYSES ==========
    const sampleRes = db.exec(`SELECT id, sample_code FROM samples WHERE sample_code LIKE 'CYP-%' OR sample_code LIKE 'PAP-%' ORDER BY id`);
    const sampleMap = {};
    for (const row of sampleRes[0].values) { sampleMap[row[1]] = row[0]; }

    // Compositions reflect geological provenance
    const cyprusAnalyses = [
        // Ophiolite igneous — high Cr, Ni, Fe, Mg
        { sample: 'CYP-001', method: 'pXRF', lab: 'STARC Cyprus', analyst: 'Dr. Elena Georgiou', elements: { 'SiO2': [44.8, 'wt%'], 'Al2O3': [14.2, 'wt%'], 'Fe2O3': [12.5, 'wt%'], 'CaO': [6.8, 'wt%'], 'MgO': [9.1, 'wt%'], 'Na2O': [1.8, 'wt%'], 'K2O': [0.9, 'wt%'], 'TiO2': [1.6, 'wt%'], 'P2O5': [0.18, 'wt%'], 'MnO': [0.18, 'wt%'], 'Cr': [580, 'ppm'], 'Ni': [320, 'ppm'], 'V': [245, 'ppm'], 'Co': [52, 'ppm'], 'Zn': [88, 'ppm'], 'Rb': [18, 'ppm'], 'Sr': [195, 'ppm'], 'Zr': [78, 'ppm'], 'Ba': [145, 'ppm'] } },
        { sample: 'CYP-002', method: 'pXRF', lab: 'STARC Cyprus', analyst: 'Dr. Elena Georgiou', elements: { 'SiO2': [46.2, 'wt%'], 'Al2O3': [13.8, 'wt%'], 'Fe2O3': [11.9, 'wt%'], 'CaO': [7.5, 'wt%'], 'MgO': [8.4, 'wt%'], 'Na2O': [2.0, 'wt%'], 'K2O': [1.1, 'wt%'], 'TiO2': [1.5, 'wt%'], 'P2O5': [0.2, 'wt%'], 'MnO': [0.16, 'wt%'], 'Cr': [510, 'ppm'], 'Ni': [285, 'ppm'], 'V': [230, 'ppm'], 'Co': [48, 'ppm'], 'Zn': [92, 'ppm'], 'Rb': [22, 'ppm'], 'Sr': [210, 'ppm'], 'Zr': [82, 'ppm'], 'Ba': [160, 'ppm'] } },

        // Circum-Troodos calcareous — high Ca, low Cr/Ni
        { sample: 'CYP-003', method: 'XRF', lab: 'STARC Cyprus', analyst: 'Dr. Marios Constantinou', elements: { 'SiO2': [38.5, 'wt%'], 'Al2O3': [10.2, 'wt%'], 'Fe2O3': [4.5, 'wt%'], 'CaO': [28.2, 'wt%'], 'MgO': [2.8, 'wt%'], 'Na2O': [0.8, 'wt%'], 'K2O': [1.5, 'wt%'], 'TiO2': [0.5, 'wt%'], 'P2O5': [0.3, 'wt%'], 'MnO': [0.05, 'wt%'], 'Cr': [35, 'ppm'], 'Ni': [22, 'ppm'], 'V': [55, 'ppm'], 'Rb': [48, 'ppm'], 'Sr': [620, 'ppm'], 'Zr': [88, 'ppm'], 'Ba': [210, 'ppm'] } },
        { sample: 'CYP-004', method: 'XRF', lab: 'STARC Cyprus', analyst: 'Dr. Marios Constantinou', elements: { 'SiO2': [42.1, 'wt%'], 'Al2O3': [11.5, 'wt%'], 'Fe2O3': [5.1, 'wt%'], 'CaO': [24.5, 'wt%'], 'MgO': [2.2, 'wt%'], 'Na2O': [0.9, 'wt%'], 'K2O': [1.8, 'wt%'], 'TiO2': [0.55, 'wt%'], 'P2O5': [0.25, 'wt%'], 'MnO': [0.06, 'wt%'], 'Cr': [28, 'ppm'], 'Ni': [18, 'ppm'], 'V': [48, 'ppm'], 'Rb': [55, 'ppm'], 'Sr': [710, 'ppm'], 'Zr': [95, 'ppm'], 'Ba': [240, 'ppm'] } },
        { sample: 'CYP-005', method: 'XRF', lab: 'STARC Cyprus', analyst: 'Dr. Marios Constantinou', elements: { 'SiO2': [40.2, 'wt%'], 'Al2O3': [10.8, 'wt%'], 'Fe2O3': [4.8, 'wt%'], 'CaO': [26.5, 'wt%'], 'MgO': [2.5, 'wt%'], 'Na2O': [0.85, 'wt%'], 'K2O': [1.6, 'wt%'], 'TiO2': [0.52, 'wt%'], 'P2O5': [0.28, 'wt%'], 'MnO': [0.055, 'wt%'], 'Cr': [32, 'ppm'], 'Ni': [20, 'ppm'], 'V': [52, 'ppm'], 'Rb': [50, 'ppm'], 'Sr': [660, 'ppm'], 'Zr': [90, 'ppm'], 'Ba': [225, 'ppm'] } },

        // Eastern calcareous alluvial
        { sample: 'CYP-006', method: 'ICP-MS', lab: 'University of Cyprus', analyst: 'Dr. Elena Georgiou', elements: { 'SiO2': [52.5, 'wt%'], 'Al2O3': [13.8, 'wt%'], 'Fe2O3': [6.2, 'wt%'], 'CaO': [12.8, 'wt%'], 'MgO': [2.6, 'wt%'], 'Na2O': [1.5, 'wt%'], 'K2O': [2.2, 'wt%'], 'TiO2': [0.75, 'wt%'], 'P2O5': [0.22, 'wt%'], 'MnO': [0.09, 'wt%'], 'Cr': [85, 'ppm'], 'Ni': [52, 'ppm'], 'V': [95, 'ppm'], 'Rb': [72, 'ppm'], 'Sr': [385, 'ppm'], 'Zr': [125, 'ppm'], 'Ba': [320, 'ppm'], 'La': [25, 'ppm'], 'Ce': [52, 'ppm'], 'Sc': [14, 'ppm'] } },

        // Pillow lava — moderate Cr/Ni, altered basalt signature
        { sample: 'CYP-007', method: 'pXRF', lab: 'STARC Cyprus', analyst: 'Dr. Elena Georgiou', elements: { 'SiO2': [48.5, 'wt%'], 'Al2O3': [15.2, 'wt%'], 'Fe2O3': [10.2, 'wt%'], 'CaO': [8.5, 'wt%'], 'MgO': [6.8, 'wt%'], 'Na2O': [2.2, 'wt%'], 'K2O': [0.6, 'wt%'], 'TiO2': [1.4, 'wt%'], 'P2O5': [0.15, 'wt%'], 'MnO': [0.15, 'wt%'], 'Cr': [310, 'ppm'], 'Ni': [165, 'ppm'], 'V': [210, 'ppm'], 'Co': [42, 'ppm'], 'Zn': [78, 'ppm'], 'Rb': [12, 'ppm'], 'Sr': [175, 'ppm'], 'Zr': [65, 'ppm'], 'Ba': [95, 'ppm'] } },

        // Chert-rich — high SiO2
        { sample: 'CYP-008', method: 'pXRF', lab: 'STARC Cyprus', analyst: 'Dr. Elena Georgiou', elements: { 'SiO2': [62.8, 'wt%'], 'Al2O3': [12.5, 'wt%'], 'Fe2O3': [5.8, 'wt%'], 'CaO': [6.2, 'wt%'], 'MgO': [2.1, 'wt%'], 'Na2O': [1.2, 'wt%'], 'K2O': [2.0, 'wt%'], 'TiO2': [0.65, 'wt%'], 'P2O5': [0.15, 'wt%'], 'MnO': [0.08, 'wt%'], 'Cr': [55, 'ppm'], 'Ni': [35, 'ppm'], 'V': [75, 'ppm'], 'Rb': [65, 'ppm'], 'Sr': [245, 'ppm'], 'Zr': [145, 'ppm'], 'Ba': [280, 'ppm'] } },

        // Mammonia terrigenous — mixed siliciclastic
        { sample: 'PAP-001', method: 'ICP-MS', lab: 'University of Cyprus', analyst: 'Dr. Andreas Kakoulli', elements: { 'SiO2': [58.5, 'wt%'], 'Al2O3': [15.8, 'wt%'], 'Fe2O3': [7.2, 'wt%'], 'CaO': [5.5, 'wt%'], 'MgO': [3.2, 'wt%'], 'Na2O': [1.8, 'wt%'], 'K2O': [2.8, 'wt%'], 'TiO2': [0.85, 'wt%'], 'P2O5': [0.18, 'wt%'], 'MnO': [0.1, 'wt%'], 'Cr': [120, 'ppm'], 'Ni': [68, 'ppm'], 'V': [125, 'ppm'], 'Rb': [88, 'ppm'], 'Sr': [280, 'ppm'], 'Zr': [155, 'ppm'], 'Ba': [380, 'ppm'], 'La': [30, 'ppm'], 'Ce': [62, 'ppm'], 'Sc': [16, 'ppm'] } },
        { sample: 'PAP-003', method: 'ICP-MS', lab: 'University of Cyprus', analyst: 'Dr. Andreas Kakoulli', elements: { 'SiO2': [56.2, 'wt%'], 'Al2O3': [16.2, 'wt%'], 'Fe2O3': [7.8, 'wt%'], 'CaO': [5.9, 'wt%'], 'MgO': [3.5, 'wt%'], 'Na2O': [1.6, 'wt%'], 'K2O': [2.5, 'wt%'], 'TiO2': [0.9, 'wt%'], 'P2O5': [0.2, 'wt%'], 'MnO': [0.11, 'wt%'], 'Cr': [135, 'ppm'], 'Ni': [75, 'ppm'], 'V': [132, 'ppm'], 'Rb': [82, 'ppm'], 'Sr': [265, 'ppm'], 'Zr': [148, 'ppm'], 'Ba': [360, 'ppm'], 'La': [28, 'ppm'], 'Ce': [58, 'ppm'], 'Sc': [17, 'ppm'] } },

        // Mammonia volcanic — altered volcanics
        { sample: 'PAP-002', method: 'XRF', lab: 'University of Cyprus', analyst: 'Dr. Andreas Kakoulli', elements: { 'SiO2': [50.5, 'wt%'], 'Al2O3': [16.5, 'wt%'], 'Fe2O3': [9.8, 'wt%'], 'CaO': [7.2, 'wt%'], 'MgO': [5.5, 'wt%'], 'Na2O': [2.5, 'wt%'], 'K2O': [1.2, 'wt%'], 'TiO2': [1.3, 'wt%'], 'P2O5': [0.22, 'wt%'], 'MnO': [0.14, 'wt%'], 'Cr': [195, 'ppm'], 'Ni': [110, 'ppm'], 'V': [185, 'ppm'], 'Rb': [32, 'ppm'], 'Sr': [225, 'ppm'], 'Zr': [95, 'ppm'], 'Ba': [175, 'ppm'] } },
        { sample: 'PAP-004', method: 'XRF', lab: 'University of Cyprus', analyst: 'Dr. Andreas Kakoulli', elements: { 'SiO2': [48.8, 'wt%'], 'Al2O3': [17.2, 'wt%'], 'Fe2O3': [10.5, 'wt%'], 'CaO': [6.8, 'wt%'], 'MgO': [5.8, 'wt%'], 'Na2O': [2.3, 'wt%'], 'K2O': [1.0, 'wt%'], 'TiO2': [1.35, 'wt%'], 'P2O5': [0.2, 'wt%'], 'MnO': [0.15, 'wt%'], 'Cr': [210, 'ppm'], 'Ni': [118, 'ppm'], 'V': [195, 'ppm'], 'Rb': [28, 'ppm'], 'Sr': [215, 'ppm'], 'Zr': [88, 'ppm'], 'Ba': [165, 'ppm'] } },

        // Troodos ultrabasic — extreme Cr/Ni
        { sample: 'PAP-005', method: 'pXRF', lab: 'STARC Cyprus', analyst: 'Dr. Elena Georgiou', elements: { 'SiO2': [40.2, 'wt%'], 'Al2O3': [8.5, 'wt%'], 'Fe2O3': [14.8, 'wt%'], 'CaO': [5.2, 'wt%'], 'MgO': [18.5, 'wt%'], 'Na2O': [0.5, 'wt%'], 'K2O': [0.3, 'wt%'], 'TiO2': [0.4, 'wt%'], 'P2O5': [0.05, 'wt%'], 'MnO': [0.22, 'wt%'], 'Cr': [2200, 'ppm'], 'Ni': [1450, 'ppm'], 'V': [85, 'ppm'], 'Co': [95, 'ppm'], 'Zn': [55, 'ppm'], 'Rb': [5, 'ppm'], 'Sr': [45, 'ppm'], 'Zr': [18, 'ppm'], 'Ba': [25, 'ppm'] } },

        // Kyrenia limestone — very high CaO
        { sample: 'PAP-007', method: 'XRF', lab: 'University of Cyprus', analyst: 'Dr. Andreas Kakoulli', elements: { 'SiO2': [22.5, 'wt%'], 'Al2O3': [6.2, 'wt%'], 'Fe2O3': [2.8, 'wt%'], 'CaO': [42.5, 'wt%'], 'MgO': [3.8, 'wt%'], 'Na2O': [0.4, 'wt%'], 'K2O': [0.8, 'wt%'], 'TiO2': [0.28, 'wt%'], 'P2O5': [0.15, 'wt%'], 'MnO': [0.03, 'wt%'], 'Cr': [12, 'ppm'], 'Ni': [8, 'ppm'], 'V': [22, 'ppm'], 'Rb': [25, 'ppm'], 'Sr': [1250, 'ppm'], 'Zr': [42, 'ppm'], 'Ba': [85, 'ppm'] } },

        // Chalky marl
        { sample: 'PAP-006', method: 'XRF', lab: 'University of Cyprus', analyst: 'Dr. Andreas Kakoulli', elements: { 'SiO2': [44.5, 'wt%'], 'Al2O3': [12.2, 'wt%'], 'Fe2O3': [5.5, 'wt%'], 'CaO': [22.0, 'wt%'], 'MgO': [2.4, 'wt%'], 'Na2O': [0.9, 'wt%'], 'K2O': [1.7, 'wt%'], 'TiO2': [0.55, 'wt%'], 'P2O5': [0.22, 'wt%'], 'MnO': [0.06, 'wt%'], 'Cr': [30, 'ppm'], 'Ni': [19, 'ppm'], 'V': [50, 'ppm'], 'Rb': [52, 'ppm'], 'Sr': [680, 'ppm'], 'Zr': [92, 'ppm'], 'Ba': [230, 'ppm'] } },
    ];

    for (const a of cyprusAnalyses) {
        db.run(`INSERT INTO analyses (sample_id, method, laboratory, analyst, analysis_date, created_by) VALUES (?,?,?,?,?,?)`,
            [sampleMap[a.sample], a.method, a.lab, a.analyst, '2025-08-20', adminId]);
        const analysisId = lastId();
        for (const [element, [value, unit]] of Object.entries(a.elements)) {
            db.run(`INSERT INTO elemental_data (analysis_id, element, value, unit) VALUES (?,?,?,?)`,
                [analysisId, element, value, unit]);
        }
    }
    console.log(`✅ Seeded ${cyprusAnalyses.length} Cyprus elemental analyses`);

    // Save
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    db.close();
    console.log('🇨🇾 Cyprus data seeding complete!');
}

seedCyprus().catch(console.error);
