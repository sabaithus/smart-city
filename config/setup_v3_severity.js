require('dotenv').config();
const db = require('./database');

async function run() {
    try {
        console.log('🔄 Running V3 Severity Engine Migrations...');

        // 1. Fetch constraint names for 'severity' and 'status' on 'reports'
        const constraintsRes = await db.query(`
            SELECT conname 
            FROM pg_constraint 
            WHERE conrelid = 'reports'::regclass 
            AND contype = 'c';
        `);

        // Drop the CHECK constraints
        for (const row of constraintsRes.rows) {
            console.log(`Dropping constraint: ${row.conname}`);
            await db.query(`ALTER TABLE reports DROP CONSTRAINT IF EXISTS "${row.conname}";`);
        }

        // 2. Add New Columns to reports
        const newColumns = [
            `severity_score INTEGER DEFAULT 0`,
            `confidence INTEGER DEFAULT 0`,
            `routing_decision VARCHAR(64)`,
            `ai_reasoning TEXT`,
            `human_safety_risk INTEGER`,
            `infrastructure_damage INTEGER`,
            `public_impact INTEGER`,
            `urgency_indicators INTEGER`,
            `evidence_score INTEGER`,
            `spam_probability INTEGER DEFAULT 0`
        ];

        for (const col of newColumns) {
            const colName = col.split(' ')[0];
            await db.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS ${colName} ${col.replace(colName + ' ', '')};`);
            console.log(`Added column: ${colName}`);
        }

        // 3. Update defaults and existing data if necessary (optional)
        // Set severity to lowercase just in case
        await db.query(`UPDATE reports SET severity = LOWER(severity);`);

        console.log('✅ V3 Migrations Complete!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    }
}

run();
