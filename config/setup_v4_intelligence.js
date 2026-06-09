require('dotenv').config();
const db = require('./database');

async function run() {
    try {
        console.log('🔄 Running V4 Incident Intelligence Engine Migrations...');

        // 1. Add new columns to reports table
        const reportColumns = [
            `duplicate_of INTEGER REFERENCES reports(id) ON DELETE SET NULL`,
            `engagement_count INTEGER DEFAULT 1`,
            `citizen_concern_score INTEGER DEFAULT 0`,
            `severity_engine_version VARCHAR(32) DEFAULT 'v2.0'`,
            `image_quality_score INTEGER DEFAULT 0`,
            `image_verification_status VARCHAR(32) DEFAULT 'pending'`,
            `sla_target_hours INTEGER`,
            `assigned_team VARCHAR(128)`
        ];

        for (const col of reportColumns) {
            const colName = col.split(' ')[0];
            await db.query(`ALTER TABLE reports ADD COLUMN IF NOT EXISTS ${colName} ${col.replace(colName + ' ', '')};`);
            console.log(`Added column to reports: ${colName}`);
        }

        // 2. Add trust_score to users table
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50;`);
        console.log(`Added column to users: trust_score`);

        // 3. Create incident_audit_trail table
        await db.query(`
            CREATE TABLE IF NOT EXISTS incident_audit_trail (
                id SERIAL PRIMARY KEY,
                report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
                raw_ai_output JSONB,
                confidence INTEGER,
                score_components JSONB,
                overrides_applied JSONB,
                duplicate_detection_results JSONB,
                routing_decisions JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log(`Created table: incident_audit_trail`);

        console.log('✅ V4 Migrations Complete!');
        process.exit(0);
    } catch (e) {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    }
}

run();
