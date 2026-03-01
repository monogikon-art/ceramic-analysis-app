/**
 * CeramicDB — Database Initialization
 * Works with both SQLite and PostgreSQL
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function initDatabase(db) {
    console.log('🏺 Initializing CeramicDB database...');

    // Run schema
    const isPg = !!process.env.DATABASE_URL;
    const schemaFile = isPg ? 'schema-pg.sql' : 'schema.sql';
    const schemaPath = path.join(__dirname, schemaFile);
    const schema = fs.readFileSync(schemaPath, 'utf8');

    if (isPg) {
        // PostgreSQL: execute statements individually (can't batch with PRAGMAs)
        await db.exec(schema);
    } else {
        // SQLite
        db.exec(schema);
    }
    console.log('✅ Schema created successfully');

    // Check if we need to seed
    const adminCheck = await db.prepare("SELECT id FROM users WHERE email = 'admin@ceramicdb.local'").get();

    if (!adminCheck) {
        const hash = bcrypt.hashSync('admin123', 10);
        await db.prepare(
            `INSERT INTO users (email, password_hash, first_name, last_name, university, department, role)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run('admin@ceramicdb.local', hash, 'System', 'Administrator', 'CeramicDB', 'Administration', 'admin');
        console.log('✅ Default admin user created (admin@ceramicdb.local / admin123)');
    }

    const adminRow = await db.prepare("SELECT id FROM users WHERE email = 'admin@ceramicdb.local'").get();
    const adminId = adminRow.id;

    // Seed fabric groups
    const fgCount = await db.prepare('SELECT COUNT(*) as count FROM fabric_groups').get();
    if (fgCount.count === 0 || fgCount.count === '0') {
        const fabricGroups = [
            ['Fine Calcareous', 'FC', 'Fine-grained calcareous fabric with abundant calcite and limestone inclusions', 'Calcite, micritic limestone, rare quartz', 'Calcite, limestone, foraminifera', 'Pale yellow to buff', '<900°C', null],
            ['Coarse Calcareous', 'CC', 'Coarse calcareous fabric with large limestone and calcite inclusions', 'Large calcite fragments, sparry calcite', 'Calcite, limestone, chert', 'Cream to light brown', '<850°C', null],
            ['Fine Non-Calcareous', 'FNC', 'Fine-grained siliceous fabric with quartz and feldspar', 'Fine quartz, feldspar, mica', 'Quartz, feldspar, muscovite, biotite', 'Red to brown', '800-1000°C', null],
            ['Coarse Quartz-Rich', 'CQR', 'Coarse fabric dominated by quartz inclusions', 'Abundant quartz, polycrystalline quartz', 'Quartz, quartzite, feldspar', 'Brown to dark brown', '700-900°C', null],
            ['Micaceous', 'MIC', 'Fabric characterized by abundant mica inclusions', 'Abundant muscovite and/or biotite', 'Muscovite, biotite, quartz', 'Silver-grey to brown', '700-900°C', null],
            ['Volcanic', 'VOL', 'Fabric with volcanic rock fragments and minerals', 'Volcanic glass, pyroxene, olivine', 'Basalt, pumice, pyroxene, olivine, plagioclase', 'Dark grey to black', '800-1000°C', null],
            ['Grog-Tempered', 'GRG', 'Fabric tempered with crushed ceramic', 'Fragments of fired clay', 'Grog/chamotte, quartz', 'Variable', 'Variable', null],
            ['Shell-Tempered', 'SHL', 'Fabric tempered with crushed shell', 'Shell fragments', 'Mollusc shell, calcite', 'Cream to light brown', '<800°C', null],
            ['Sand-Tempered', 'SND', 'Fabric with added sand temper', 'Well-sorted angular quartz', 'Quartz sand, feldspar', 'Brown to reddish', '700-900°C', null],
            ['Mixed Temper', 'MXT', 'Fabric with multiple tempering materials', 'Combination of mineral and organic', 'Quartz, grog, organic material', 'Variable', 'Variable', null],
            // Cyprus — Troodos Ophiolite
            ['Troodos Ophiolite Igneous', 'TOI', 'Fabric with mafic/ultramafic rock fragments from the Troodos ophiolite complex', 'Diabase, gabbro, and serpentinite fragments; high Cr and Ni values', 'Pyroxene, olivine, serpentinite, chromite, diabase, plagioclase', 'Dark brown to greenish-brown', '800-1000°C', 'Cyprus — Troodos Ophiolite'],
            ['Troodos Pillow Lava', 'TPL', 'Fabric containing altered pillow lava fragments typical of the upper Troodos sequence', 'Altered basalt, zeolites, epidote, chlorite', 'Altered basalt, epidote, chlorite, zeolite, quartz', 'Reddish-brown to grey', '750-950°C', 'Cyprus — Troodos Ophiolite'],
            ['Troodos Ultrabasic', 'TUB', 'Fabric rich in ultrabasic rock fragments from the Troodos harzburgite-dunite core', 'Serpentinised harzburgite, dunite; very high Cr, Ni, MgO', 'Serpentinite, chromite, olivine, orthopyroxene, magnetite', 'Dark greenish-grey to black', '800-950°C', 'Cyprus — Troodos Ophiolite'],
            // Cyprus — Circum-Troodos Sedimentary
            ['Circum-Troodos Calcareous', 'CTC', 'Calcareous fabric from sedimentary formations surrounding the Troodos massif', 'Chalk, marl, limestone with foraminifera; high CaO', 'Chalk, marl, limestone, foraminifera, radiolarian chert', 'Cream to pale yellow', '<850°C', 'Cyprus — Circum-Troodos Sedimentary'],
            ['Circum-Troodos Chalky Marl', 'CTM', 'Fabric from Lefkara/Pakhna chalky marl formations', 'Micritic calcite, bioclasts, clay pellets', 'Micritic limestone, clay pellets, bioclasts, rare quartz', 'Buff to pale greenish', '<800°C', 'Cyprus — Circum-Troodos Sedimentary'],
            ['Circum-Troodos Chert-Rich', 'CTCH', 'Fabric with radiolarian chert from the Perapedhi/Kannaviou formations', 'Angular chert fragments, radiolaria ghosts; elevated SiO2', 'Radiolarian chert, chalcedony, rare volcanic fragments', 'Brown to reddish-brown', '800-950°C', 'Cyprus — Circum-Troodos Sedimentary'],
            // Cyprus — Mammonia Complex
            ['Mammonia Terrigenous', 'MAT', 'Fabric derived from Mammonia complex terrigenous sediments (SW Cyprus)', 'Sandstone, siltstone, mudstone, radiolarite fragments', 'Quartz, feldspar, mica, sandstone, radiolarite, rare serpentinite', 'Brown to dark reddish-brown', '800-1000°C', 'Cyprus — Mammonia Complex'],
            ['Mammonia Volcanic', 'MAV', 'Fabric with Mammonia extrusive volcanic components', 'Altered volcanic glass, tuff, bentonitic clay', 'Volcanic glass, tuff, bentonite, feldspar, clinopyroxene', 'Greenish-brown to grey', '750-900°C', 'Cyprus — Mammonia Complex'],
            // Cyprus — Eastern Coast / Mesaoria
            ['Eastern Calcareous Alluvial', 'ECA', 'Calcareous alluvial fabric from the Mesaoria plain', 'Well-rounded calcareous grains, bioclastic sand', 'Limestone, calcarenite, bioclasts, quartz sand, iron oxides', 'Pink to light reddish-brown', '800-900°C', 'Cyprus — Eastern Coast / Mesaoria'],
            ['Eastern Havara', 'EHV', 'Fabric from havara deposits of the eastern coast', 'Calcrete fragments, micritic nodules', 'Calcrete, micritic calcite, quartz, rare chert', 'White to pale buff', '<800°C', 'Cyprus — Eastern Coast'],
            // Cyprus — Kyrenia Range
            ['Kyrenia Limestone', 'KRL', 'Fabric from the Kyrenia Range recrystallized limestones', 'Sparry and micritic limestone, marble; very high CaO', 'Recrystallised limestone, marble, calcite veins, rare quartz', 'White to cream', '<850°C', 'Cyprus — Kyrenia Range'],
            ['Kyrenia Flysch', 'KRF', 'Fabric from the Kythrea flysch formation', 'Alternating sandstone/mudstone clasts, turbidite textures', 'Quartz, feldspar, lithic sandstone, mudstone, mica, glauconite', 'Greenish-grey to brown', '800-950°C', 'Cyprus — Kyrenia Range'],
        ];

        for (const fg of fabricGroups) {
            await db.prepare(
                'INSERT INTO fabric_groups (name, code, description, key_characteristics, typical_inclusions, color_range, firing_range, region) VALUES (?,?,?,?,?,?,?,?)'
            ).run(...fg);
        }
        console.log(`✅ Seeded ${fabricGroups.length} fabric groups (including Cyprus)`);
    }

    // Seed demo projects & samples
    const projCount = await db.prepare('SELECT COUNT(*) as count FROM projects').get();
    if (projCount.count === 0 || projCount.count === '0') {
        await seedProjects(db, adminId);
    }

    console.log('🏺 CeramicDB initialization complete!');
}

async function seedProjects(db, adminId) {
    // Helper to get fabric group id by code
    async function fgId(code) {
        const row = await db.prepare('SELECT id FROM fabric_groups WHERE code = ?').get(code);
        return row ? row.id : null;
    }

    // --- Aegean project ---
    const p1 = await db.prepare(
        `INSERT INTO projects (name, description, principal_investigator, university, funding_source, start_date, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run('Aegean Bronze Age Ceramics', 'Compositional analysis of Middle and Late Bronze Age pottery from the Aegean region',
        'Dr. Maria Papadopoulou', 'University of Athens', 'ERC Starting Grant', '2025-01-01', 'active', adminId);
    const proj0Id = p1.lastInsertRowid;

    const aegeanSamples = [
        [proj0Id, 'ABE-001', 'Akrotiri', 'AKR', 'Building Beta, Room 4', 'Layer III', 'Late Bronze Age', 'LBA IB (c. 1600 BCE)', 'Cooking pot', 'Tripod cooking pot', 'Body sherd', 'Reddish brown', '5YR 5/4', 8.2, 34.5, null, adminId],
        [proj0Id, 'ABE-002', 'Akrotiri', 'AKR', 'Building Beta, Room 6', 'Layer III', 'Late Bronze Age', 'LBA IB (c. 1600 BCE)', 'Storage jar', 'Pithos', 'Rim sherd', 'Buff', '10YR 7/4', 12.5, 67.8, null, adminId],
        [proj0Id, 'ABE-003', 'Knossos', 'KNO', 'West Court, Deposit A', 'Floor level 2', 'Middle Bronze Age', 'MBA II (c. 1800 BCE)', 'Fine ware', 'Cup', 'Complete profile', 'Dark grey', '7.5YR 4/1', 4.1, 22.3, null, adminId],
        [proj0Id, 'ABE-004', 'Knossos', 'KNO', 'North Entrance, Fill', 'Layer V', 'Late Bronze Age', 'LBA II (c. 1450 BCE)', 'Fine ware', 'Kylix', 'Stem fragment', 'Pale yellow', '2.5Y 8/3', 5.6, 18.9, null, adminId],
        [proj0Id, 'ABE-005', 'Phylakopi', 'PHY', 'Area C, Building 1', 'Phase 3', 'Late Bronze Age', 'LBA I (c. 1550 BCE)', 'Transport', 'Stirrup jar', 'Handle', 'Light red', '2.5YR 6/6', 9.3, 41.2, null, adminId],
    ];
    for (const s of aegeanSamples) {
        await db.prepare(
            `INSERT INTO samples (project_id, sample_code, site_name, site_code, excavation_context, stratigraphic_unit,
             period, chronology, ceramic_type, vessel_form, vessel_part, color, munsell_code,
             thickness_mm, weight_g, fabric_group_id, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).run(...s);
    }

    // Aegean analyses
    const aegeanAnalyses = [
        { code: 'ABE-001', method: 'XRF', lab: 'Demokritos NCSR', elements: { 'SiO2': [58.2, 'wt%'], 'Al2O3': [16.8, 'wt%'], 'Fe2O3': [8.9, 'wt%'], 'CaO': [4.2, 'wt%'], 'MgO': [3.1, 'wt%'], 'Na2O': [2.8, 'wt%'], 'K2O': [2.4, 'wt%'], 'TiO2': [1.1, 'wt%'], 'Cr': [110, 'ppm'], 'Ni': [65, 'ppm'], 'Rb': [85, 'ppm'], 'Sr': [290, 'ppm'], 'Zr': [165, 'ppm'], 'Ba': [420, 'ppm'] } },
        { code: 'ABE-002', method: 'XRF', lab: 'Demokritos NCSR', elements: { 'SiO2': [49.5, 'wt%'], 'Al2O3': [13.2, 'wt%'], 'Fe2O3': [5.8, 'wt%'], 'CaO': [18.5, 'wt%'], 'MgO': [3.8, 'wt%'], 'Na2O': [1.2, 'wt%'], 'K2O': [2.1, 'wt%'], 'TiO2': [0.7, 'wt%'], 'Cr': [45, 'ppm'], 'Ni': [30, 'ppm'], 'Rb': [62, 'ppm'], 'Sr': [580, 'ppm'], 'Zr': [120, 'ppm'], 'Ba': [310, 'ppm'] } },
        { code: 'ABE-003', method: 'ICP-MS', lab: 'University of Athens', elements: { 'SiO2': [62.1, 'wt%'], 'Al2O3': [17.5, 'wt%'], 'Fe2O3': [6.3, 'wt%'], 'CaO': [3.1, 'wt%'], 'MgO': [2.4, 'wt%'], 'Na2O': [3.2, 'wt%'], 'K2O': [2.9, 'wt%'], 'TiO2': [0.9, 'wt%'], 'Cr': [78, 'ppm'], 'Ni': [42, 'ppm'], 'Rb': [95, 'ppm'], 'Sr': [210, 'ppm'], 'Zr': [190, 'ppm'], 'Ba': [510, 'ppm'] } },
    ];
    for (const a of aegeanAnalyses) {
        const sid = await db.prepare('SELECT id FROM samples WHERE sample_code = ?').get(a.code);
        const r = await db.prepare('INSERT INTO analyses (sample_id, method, laboratory, analyst, analysis_date, created_by) VALUES (?,?,?,?,?,?)').run(sid.id, a.method, a.lab, 'Dr. Nikolaos Georgiou', '2025-06-15', adminId);
        for (const [element, [value, unit]] of Object.entries(a.elements)) {
            await db.prepare('INSERT INTO elemental_data (analysis_id, element, value, unit) VALUES (?,?,?,?)').run(r.lastInsertRowid, element, value, unit);
        }
    }

    // --- Cyprus LBA Provenance ---
    const p2 = await db.prepare(
        `INSERT INTO projects (name, description, principal_investigator, university, funding_source, start_date, status, created_by) VALUES (?,?,?,?,?,?,?,?)`
    ).run('Cyprus Late Bronze Age Provenance', 'Multi-analytical provenance study of Late Cypriot pottery', 'Dr. Elena Georgiou', 'University of Cyprus', 'Cyprus Research & Innovation Foundation', '2024-09-01', 'active', adminId);
    const proj1Id = p2.lastInsertRowid;

    // --- Paphos District ---
    const p3 = await db.prepare(
        `INSERT INTO projects (name, description, principal_investigator, university, funding_source, start_date, status, created_by) VALUES (?,?,?,?,?,?,?,?)`
    ).run('Paphos District Ceramic Production', 'Investigation of ceramic production in the Paphos district', 'Dr. Andreas Kakoulli', 'University of Cyprus', 'A.G. Leventis Foundation', '2025-03-01', 'active', adminId);
    const proj2Id = p3.lastInsertRowid;

    const cyprusSamples = [
        [proj1Id, 'CYP-001', 'Enkomi', 'ENK', 'Area III, Building 18', 'Floor 2, Room A', 'Late Bronze Age', 'LC IIC (c. 1300 BCE)', 'Fine ware', 'Base Ring II jug', 'Complete vessel', 'Grey', '10YR 5/1', 5.8, 145.0, await fgId('TOI'), adminId],
        [proj1Id, 'CYP-002', 'Enkomi', 'ENK', 'Area III, Building 18', 'Floor 2, Room B', 'Late Bronze Age', 'LC IIC (c. 1300 BCE)', 'Cooking pot', 'Cooking jug', 'Body sherd', 'Dark reddish-brown', '2.5YR 4/4', 9.4, 38.2, await fgId('TOI'), adminId],
        [proj1Id, 'CYP-003', 'Hala Sultan Tekke', 'HST', 'Area A, Well 5', 'Fill layer', 'Late Bronze Age', 'LC IIC (c. 1250 BCE)', 'Transport', 'Canaanite jar', 'Shoulder fragment', 'Buff', '10YR 7/3', 11.2, 52.1, await fgId('CTC'), adminId],
        [proj1Id, 'CYP-004', 'Hala Sultan Tekke', 'HST', 'Area 6W, Room 2', 'Floor deposit', 'Late Bronze Age', 'LC IIIA (c. 1200 BCE)', 'Fine ware', 'White Slip II bowl', 'Rim sherd', 'Cream', '2.5Y 8/2', 6.1, 24.7, await fgId('CTM'), adminId],
        [proj1Id, 'CYP-005', 'Kition', 'KIT', 'Temple 1, Bothros 9', 'Ritual deposit', 'Late Bronze Age', 'LC IIC (c. 1300 BCE)', 'Fine ware', 'White Painted WM jug', 'Complete profile', 'Pale yellow', '2.5Y 8/3', 5.2, 89.5, await fgId('CTC'), adminId],
        [proj1Id, 'CYP-006', 'Kition', 'KIT', 'Area II, Floor IV', 'Destruction layer', 'Late Bronze Age', 'LC IIIA (c. 1190 BCE)', 'Storage jar', 'Pithos', 'Rim + shoulder', 'Light red', '2.5YR 6/6', 14.5, 112.3, await fgId('ECA'), adminId],
        [proj1Id, 'CYP-007', 'Alassa-Pano Mandilaris', 'ALA', 'Building II', 'Room 3, Floor', 'Late Bronze Age', 'LC IIC (c. 1250 BCE)', 'Cooking pot', 'Flat-bottom pot', 'Base sherd', 'Dark brown', '7.5YR 4/2', 10.8, 45.6, await fgId('TPL'), adminId],
        [proj1Id, 'CYP-008', 'Kalavasos-Ayios Dhimitrios', 'KAD', 'Building X, Room A2', 'Floor deposit', 'Late Bronze Age', 'LC IIC (c. 1300 BCE)', 'Pithos', 'Storage pithos', 'Wall sherd', 'Reddish-brown', '5YR 5/4', 18.5, 156.0, await fgId('CTCH'), adminId],
        [proj2Id, 'PAP-001', 'Kouklia-Palaepaphos', 'KPP', 'Sanctuary of Aphrodite', 'Fill layer 3', 'Iron Age', 'CG III (c. 700 BCE)', 'Fine ware', 'Bichrome jug', 'Handle + body', 'Pink', '7.5YR 7/4', 6.5, 33.8, await fgId('MAT'), adminId],
        [proj2Id, 'PAP-002', 'Kouklia-Palaepaphos', 'KPP', 'Marcello Tomb 9', 'Burial deposit', 'Iron Age', 'CG I (c. 1050 BCE)', 'Fine ware', 'Proto-WP amphora', 'Complete vessel', 'Buff', '10YR 7/4', 5.9, 210.0, await fgId('MAV'), adminId],
        [proj2Id, 'PAP-003', 'Lemba-Lakkous', 'LEM', 'Structure 1A, Floor', 'Floor deposit', 'Chalcolithic', 'Middle Chalcolithic (c. 3000 BCE)', 'Coarse ware', 'Red-on-White bowl', 'Rim sherd', 'Red', '2.5YR 5/6', 8.7, 28.4, await fgId('MAT'), adminId],
        [proj2Id, 'PAP-004', 'Kissonerga-Mosphilia', 'KIS', 'Period 4, Building 3', 'Destruction layer', 'Chalcolithic', 'Late Chalcolithic (c. 2500 BCE)', 'Coarse ware', 'Storage jar', 'Body sherd', 'Brown', '7.5YR 5/4', 12.3, 41.5, await fgId('MAV'), adminId],
        [proj2Id, 'PAP-005', 'Peyia-Koudounas', 'PEY', 'Trench B, Layer 2', 'Midden deposit', 'Late Bronze Age', 'LC I (c. 1600 BCE)', 'Cooking pot', 'Handmade pot', 'Dark grey', '7.5YR 4/1', 11.0, 55.2, await fgId('TUB'), adminId],
        [proj2Id, 'PAP-006', 'Kouklia-Evreti', 'KPE', 'Workshop area, Floor', 'Production debris', 'Iron Age', 'CA I (c. 600 BCE)', 'Plain ware', 'Amphora', 'Base sherd', 'Light reddish-brown', '5YR 6/4', 8.9, 35.9, await fgId('CTM'), adminId],
        [proj2Id, 'PAP-007', 'Geroskipou', 'GER', 'Tomb 15', 'Burial assemblage', 'Iron Age', 'CG II (c. 900 BCE)', 'Fine ware', 'Black Slip jug', 'Complete', 'Black', '7.5YR 2.5/1', 4.8, 165.0, await fgId('KRL'), adminId],
    ];
    for (const s of cyprusSamples) {
        await db.prepare(
            `INSERT INTO samples (project_id, sample_code, site_name, site_code, excavation_context, stratigraphic_unit,
             period, chronology, ceramic_type, vessel_form, vessel_part, color, munsell_code,
             thickness_mm, weight_g, fabric_group_id, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        ).run(...s);
    }

    // Cyprus analyses with geologically accurate compositions
    const cyprusAnalyses = [
        { code: 'CYP-001', method: 'pXRF', lab: 'STARC Cyprus', elements: { 'SiO2': [44.8, 'wt%'], 'Al2O3': [14.2, 'wt%'], 'Fe2O3': [12.5, 'wt%'], 'CaO': [6.8, 'wt%'], 'MgO': [9.1, 'wt%'], 'Na2O': [1.8, 'wt%'], 'K2O': [0.9, 'wt%'], 'TiO2': [1.6, 'wt%'], 'Cr': [580, 'ppm'], 'Ni': [320, 'ppm'], 'V': [245, 'ppm'], 'Rb': [18, 'ppm'], 'Sr': [195, 'ppm'], 'Zr': [78, 'ppm'] } },
        { code: 'CYP-002', method: 'pXRF', lab: 'STARC Cyprus', elements: { 'SiO2': [46.2, 'wt%'], 'Al2O3': [13.8, 'wt%'], 'Fe2O3': [11.9, 'wt%'], 'CaO': [7.5, 'wt%'], 'MgO': [8.4, 'wt%'], 'Na2O': [2.0, 'wt%'], 'K2O': [1.1, 'wt%'], 'TiO2': [1.5, 'wt%'], 'Cr': [510, 'ppm'], 'Ni': [285, 'ppm'], 'V': [230, 'ppm'], 'Rb': [22, 'ppm'], 'Sr': [210, 'ppm'], 'Zr': [82, 'ppm'] } },
        { code: 'CYP-003', method: 'XRF', lab: 'STARC Cyprus', elements: { 'SiO2': [38.5, 'wt%'], 'Al2O3': [10.2, 'wt%'], 'Fe2O3': [4.5, 'wt%'], 'CaO': [28.2, 'wt%'], 'MgO': [2.8, 'wt%'], 'Na2O': [0.8, 'wt%'], 'K2O': [1.5, 'wt%'], 'TiO2': [0.5, 'wt%'], 'Cr': [35, 'ppm'], 'Sr': [620, 'ppm'], 'Zr': [88, 'ppm'] } },
        { code: 'CYP-004', method: 'XRF', lab: 'STARC Cyprus', elements: { 'SiO2': [42.1, 'wt%'], 'Al2O3': [11.5, 'wt%'], 'Fe2O3': [5.1, 'wt%'], 'CaO': [24.5, 'wt%'], 'MgO': [2.2, 'wt%'], 'Na2O': [0.9, 'wt%'], 'K2O': [1.8, 'wt%'], 'TiO2': [0.55, 'wt%'], 'Cr': [28, 'ppm'], 'Sr': [710, 'ppm'], 'Zr': [95, 'ppm'] } },
        { code: 'CYP-005', method: 'XRF', lab: 'STARC Cyprus', elements: { 'SiO2': [40.2, 'wt%'], 'Al2O3': [10.8, 'wt%'], 'Fe2O3': [4.8, 'wt%'], 'CaO': [26.5, 'wt%'], 'MgO': [2.5, 'wt%'], 'Na2O': [0.85, 'wt%'], 'K2O': [1.6, 'wt%'], 'TiO2': [0.52, 'wt%'], 'Cr': [32, 'ppm'], 'Sr': [660, 'ppm'], 'Zr': [90, 'ppm'] } },
        { code: 'CYP-006', method: 'ICP-MS', lab: 'University of Cyprus', elements: { 'SiO2': [52.5, 'wt%'], 'Al2O3': [13.8, 'wt%'], 'Fe2O3': [6.2, 'wt%'], 'CaO': [12.8, 'wt%'], 'MgO': [2.6, 'wt%'], 'Na2O': [1.5, 'wt%'], 'K2O': [2.2, 'wt%'], 'Cr': [85, 'ppm'], 'Sr': [385, 'ppm'], 'Zr': [125, 'ppm'] } },
        { code: 'CYP-007', method: 'pXRF', lab: 'STARC Cyprus', elements: { 'SiO2': [48.5, 'wt%'], 'Al2O3': [15.2, 'wt%'], 'Fe2O3': [10.2, 'wt%'], 'CaO': [8.5, 'wt%'], 'MgO': [6.8, 'wt%'], 'Na2O': [2.2, 'wt%'], 'K2O': [0.6, 'wt%'], 'TiO2': [1.4, 'wt%'], 'Cr': [310, 'ppm'], 'Ni': [165, 'ppm'] } },
        { code: 'CYP-008', method: 'pXRF', lab: 'STARC Cyprus', elements: { 'SiO2': [62.8, 'wt%'], 'Al2O3': [12.5, 'wt%'], 'Fe2O3': [5.8, 'wt%'], 'CaO': [6.2, 'wt%'], 'MgO': [2.1, 'wt%'], 'Na2O': [1.2, 'wt%'], 'K2O': [2.0, 'wt%'], 'TiO2': [0.65, 'wt%'], 'Cr': [55, 'ppm'], 'Sr': [245, 'ppm'] } },
        { code: 'PAP-001', method: 'ICP-MS', lab: 'University of Cyprus', elements: { 'SiO2': [58.5, 'wt%'], 'Al2O3': [15.8, 'wt%'], 'Fe2O3': [7.2, 'wt%'], 'CaO': [5.5, 'wt%'], 'MgO': [3.2, 'wt%'], 'Na2O': [1.8, 'wt%'], 'K2O': [2.8, 'wt%'], 'Cr': [120, 'ppm'], 'Ni': [68, 'ppm'], 'Rb': [88, 'ppm'], 'Sr': [280, 'ppm'] } },
        { code: 'PAP-002', method: 'XRF', lab: 'University of Cyprus', elements: { 'SiO2': [50.5, 'wt%'], 'Al2O3': [16.5, 'wt%'], 'Fe2O3': [9.8, 'wt%'], 'CaO': [7.2, 'wt%'], 'MgO': [5.5, 'wt%'], 'Na2O': [2.5, 'wt%'], 'K2O': [1.2, 'wt%'], 'Cr': [195, 'ppm'], 'Ni': [110, 'ppm'], 'Sr': [225, 'ppm'] } },
        { code: 'PAP-003', method: 'ICP-MS', lab: 'University of Cyprus', elements: { 'SiO2': [56.2, 'wt%'], 'Al2O3': [16.2, 'wt%'], 'Fe2O3': [7.8, 'wt%'], 'CaO': [5.9, 'wt%'], 'MgO': [3.5, 'wt%'], 'Na2O': [1.6, 'wt%'], 'K2O': [2.5, 'wt%'], 'Cr': [135, 'ppm'], 'Ni': [75, 'ppm'] } },
        { code: 'PAP-004', method: 'XRF', lab: 'University of Cyprus', elements: { 'SiO2': [48.8, 'wt%'], 'Al2O3': [17.2, 'wt%'], 'Fe2O3': [10.5, 'wt%'], 'CaO': [6.8, 'wt%'], 'MgO': [5.8, 'wt%'], 'Na2O': [2.3, 'wt%'], 'K2O': [1.0, 'wt%'], 'Cr': [210, 'ppm'], 'Ni': [118, 'ppm'] } },
        { code: 'PAP-005', method: 'pXRF', lab: 'STARC Cyprus', elements: { 'SiO2': [40.2, 'wt%'], 'Al2O3': [8.5, 'wt%'], 'Fe2O3': [14.8, 'wt%'], 'CaO': [5.2, 'wt%'], 'MgO': [18.5, 'wt%'], 'Cr': [2200, 'ppm'], 'Ni': [1450, 'ppm'] } },
        { code: 'PAP-006', method: 'XRF', lab: 'University of Cyprus', elements: { 'SiO2': [44.5, 'wt%'], 'Al2O3': [12.2, 'wt%'], 'Fe2O3': [5.5, 'wt%'], 'CaO': [22.0, 'wt%'], 'MgO': [2.4, 'wt%'], 'Cr': [30, 'ppm'], 'Sr': [680, 'ppm'] } },
        { code: 'PAP-007', method: 'XRF', lab: 'University of Cyprus', elements: { 'SiO2': [22.5, 'wt%'], 'Al2O3': [6.2, 'wt%'], 'Fe2O3': [2.8, 'wt%'], 'CaO': [42.5, 'wt%'], 'MgO': [3.8, 'wt%'], 'Cr': [12, 'ppm'], 'Sr': [1250, 'ppm'] } },
    ];
    for (const a of cyprusAnalyses) {
        const sid = await db.prepare('SELECT id FROM samples WHERE sample_code = ?').get(a.code);
        const r = await db.prepare('INSERT INTO analyses (sample_id, method, laboratory, analyst, analysis_date, created_by) VALUES (?,?,?,?,?,?)').run(sid.id, a.method, a.lab, 'Dr. Elena Georgiou', '2025-08-20', adminId);
        for (const [element, [value, unit]] of Object.entries(a.elements)) {
            await db.prepare('INSERT INTO elemental_data (analysis_id, element, value, unit) VALUES (?,?,?,?)').run(r.lastInsertRowid, element, value, unit);
        }
    }

    console.log('✅ Seeded all demo projects, samples, and analyses');
}

module.exports = { initDatabase };
