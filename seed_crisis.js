require('dotenv').config();
const db = require('./config/database');
const { logTimelineEvent } = require('./services/timelineService');

async function seed() {
    try {
        console.log('Starting Crisis Seed...');
        
        // Ensure Otrar district exists
        const distRes = await db.query("SELECT id FROM districts WHERE name = 'Otrar District'");
        let districtId;
        if (distRes.rowCount === 0) {
            console.log('Otrar District not found. Creating...');
            const insertDist = await db.query("INSERT INTO districts (name, bounds) VALUES ('Otrar District', '[]') RETURNING id");
            districtId = insertDist.rows[0].id;
        } else {
            districtId = distRes.rows[0].id;
        }

        // Ensure user 1 exists
        const userRes = await db.query("SELECT id FROM users LIMIT 1");
        if (userRes.rowCount === 0) {
            console.log('No users found. Creating a test user...');
            await db.query("INSERT INTO users (name, phone, role) VALUES ('Test Citizen', '+77000000000', 'citizen')");
        }
        const userId = (await db.query("SELECT id FROM users LIMIT 1")).rows[0].id;

        // Create 3 reports
        console.log('Creating 3 Fire Reports...');
        const r1 = await db.query(`INSERT INTO reports (user_id, category, title, description, severity, status, latitude, longitude, district_id) 
            VALUES ($1, 'fire', 'Massive smoke near factory', 'Can see heavy black smoke from the industrial area.', 'high', 'pending', 43.28, 68.23, $2) RETURNING id`, [userId, districtId]);
        const r2 = await db.query(`INSERT INTO reports (user_id, category, title, description, severity, status, latitude, longitude, district_id) 
            VALUES ($1, 'fire', 'Flames visible from highway', 'Large fire breaking out near the old warehouses.', 'high', 'pending', 43.281, 68.231, $2) RETURNING id`, [userId, districtId]);
        const r3 = await db.query(`INSERT INTO reports (user_id, category, title, description, severity, status, latitude, longitude, district_id) 
            VALUES ($1, 'fire', 'Explosion sound and fire', 'Heard a loud boom and now there is fire.', 'high', 'pending', 43.279, 68.232, $2) RETURNING id`, [userId, districtId]);
        
        const rIds = [r1.rows[0].id, r2.rows[0].id, r3.rows[0].id];

        for(let id of rIds) {
            await logTimelineEvent('report', id, 'Reported by Citizen');
            // small delay to show chronological order
            await new Promise(resolve => setTimeout(resolve, 100));
            await logTimelineEvent('report', id, 'AI Classified: Critical Fire Hazard');
        }

        // Create Crisis Event
        console.log('Creating Crisis Event...');
        const crisis = await db.query(`INSERT INTO crisis_events (district_id, title, severity, status, description) 
            VALUES ($1, 'Major Industrial Fire', 'Critical', 'Active', 'Multiple reports indicate a severe industrial fire with potential explosions in the Otrar District.') RETURNING id`, [districtId]);
        
        const crisisId = crisis.rows[0].id;

        // Update Reports with Crisis ID
        for(let id of rIds) {
            await db.query(`UPDATE reports SET crisis_event_id = $1 WHERE id = $2`, [crisisId, id]);
        }

        // Log Crisis Timelines
        await logTimelineEvent('crisis', crisisId, 'AI detected emerging crisis from 3 related reports.');
        await new Promise(resolve => setTimeout(resolve, 100));
        await logTimelineEvent('crisis', crisisId, 'Emergency Response Units notified automatically.');

        console.log('Crisis Seeded Successfully! Crisis ID:', crisisId);
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
