// config/seed_turkestan.js
// Migration & Seeding script for Turkestan Smart City incidents.

const db = require('./database');

async function runSeed() {
    try {
        console.log('🔄 Running migrations: Adding image_url column...');
        await db.query(`
            ALTER TABLE reports 
            ADD COLUMN IF NOT EXISTS image_url VARCHAR(512);
        `);
        console.log('✅ image_url column check/add successful.');

        console.log('🔄 Cleaning up previous incidents...');
        await db.query('TRUNCATE TABLE reports RESTART IDENTITY CASCADE;');
        console.log('✅ Cleared previous incidents successfully.');

        // Find a valid user ID to associate reports with
        const userRes = await db.query("SELECT id, full_name FROM users ORDER BY id ASC LIMIT 1");
        if (userRes.rows.length === 0) {
            throw new Error('No users found in database! Please register a user first.');
        }
        const userId = userRes.rows[0].id;
        console.log(`👤 Using User: "${userRes.rows[0].full_name}" (ID: ${userId}) for incident reports.`);

        const reports = [
            {
                category: 'road hazard',
                title: 'Broken streetlights near Yasawi Mausoleum',
                description: 'One of the main streets leading to the Khoja Ahmed Yasawi Mausoleum is completely dark because the streetlights are broken. This makes it dangerous for tourists and residents walking in the evening.',
                severity: 'medium',
                location: 'Yasawi Mausoleum Area, Turkestan',
                latitude: 43.2985,
                longitude: 68.2711,
                image_url: '/images/map/yasawi_lights.png',
                status: 'pending'
            },
            {
                category: 'road hazard',
                title: 'Deep pothole on Tauke Khan Avenue',
                description: 'A deep, dangerous pothole has formed on Tauke Khan Avenue, near the main market. Several cars have already damaged their tires. Needs urgent patch repair.',
                severity: 'medium',
                location: 'Tauke Khan Avenue, Turkestan',
                latitude: 43.2995,
                longitude: 68.2612,
                image_url: '/images/map/tauke_khan_pothole.png',
                status: 'pending'
            },
            {
                category: 'flooding',
                title: 'Street flooding in Otrar District',
                description: "Severe storm water accumulation on the road in the Otrar microdistrict after yesterday's heavy rain. The drainage system is clogged, making it impossible for pedestrians to cross.",
                severity: 'medium',
                location: 'Otrar Microdistrict, Turkestan',
                latitude: 43.2842,
                longitude: 68.2395,
                image_url: '/images/map/otrar_flooding.png',
                status: 'pending'
            },
            {
                category: 'other',
                title: 'Stray dogs pack near playground',
                description: 'A pack of stray dogs is roaming near the central playground, making parents and children uncomfortable. They are peaceful but need shelter relocation.',
                severity: 'medium',
                location: 'Shavgar District, Turkestan',
                latitude: 43.3121,
                longitude: 68.2815,
                image_url: '/images/map/shavgar_dogs.png',
                status: 'pending'
            }
        ];

        console.log('🔄 Seeding new incidents...');
        for (const r of reports) {
            await db.query(`
                INSERT INTO reports (user_id, category, title, description, severity, location, latitude, longitude, status, image_url)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `, [userId, r.category, r.title, r.description, r.severity, r.location, r.latitude, r.longitude, r.status, r.image_url]);
        }
        console.log('✅ Seeding completed successfully! 4 incidents added.');
        process.exit(0);

    } catch (err) {
        console.error('❌ Migration & Seeding failed:', err.message);
        process.exit(1);
    }
}

runSeed();
