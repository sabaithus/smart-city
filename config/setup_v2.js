require('dotenv').config();
const db = require('./database');

async function run() {
    try {
        console.log('🔄 Running V2 Migrations...');

        // 1. Create Districts
        await db.query(`
            CREATE TABLE IF NOT EXISTS districts (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                bounds_json JSONB
            );
        `);

        // 2. Create Crisis Events
        await db.query(`
            CREATE TABLE IF NOT EXISTS crisis_events (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                district_id INTEGER REFERENCES districts(id),
                severity VARCHAR(50),
                status VARCHAR(50) DEFAULT 'Detected',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP
            );
        `);

        // 3. Alter Reports
        await db.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES districts(id);`);
        await db.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS crisis_event_id INTEGER REFERENCES crisis_events(id);`);
        await db.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP;`);

        // 4. Create Event Timeline
        await db.query(`
            CREATE TABLE IF NOT EXISTS event_timeline (
                id SERIAL PRIMARY KEY,
                entity_type VARCHAR(50) NOT NULL,
                entity_id INTEGER NOT NULL,
                action VARCHAR(255) NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Tables and columns created successfully.');

        // 5. Seed Districts
        const countRes = await db.query('SELECT COUNT(*) FROM districts');
        if (parseInt(countRes.rows[0].count) === 0) {
            const districts = [
                { name: 'Otrar District', bounds: { latMin: 43.27, latMax: 43.29, lngMin: 68.22, lngMax: 68.25 } },
                { name: 'Yasawi Area', bounds: { latMin: 43.29, latMax: 43.31, lngMin: 68.26, lngMax: 68.28 } },
                { name: 'Tauke Khan', bounds: { latMin: 43.29, latMax: 43.31, lngMin: 68.24, lngMax: 68.26 } },
                { name: 'Shavgar District', bounds: { latMin: 43.31, latMax: 43.33, lngMin: 68.26, lngMax: 68.30 } },
                { name: 'Central District', bounds: { latMin: 43.29, latMax: 43.31, lngMin: 68.28, lngMax: 68.30 } }
            ];

            for (const d of districts) {
                await db.query('INSERT INTO districts (name, bounds_json) VALUES ($1, $2)', [d.name, JSON.stringify(d.bounds)]);
            }
            console.log('✅ Seeded 5 districts for Turkestan.');
        }

        console.log('🎉 Migration Complete!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    }
}

run();
