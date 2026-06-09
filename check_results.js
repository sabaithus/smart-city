require('dotenv').config();
const db = require('./config/database');

async function check() {
    console.log("=== ПОСЛЕДНИЕ ИНЦИДЕНТЫ ===");
    const reports = await db.query(`
        SELECT id, title, severity, status, routing_decision, sla_target_hours, assigned_team, duplicate_of, engagement_count 
        FROM reports 
        ORDER BY created_at DESC 
        LIMIT 5
    `);
    console.table(reports.rows);

    console.log("\n=== АУДИТ РЕШЕНИЙ ИИ ===");
    const audits = await db.query(`
        SELECT report_id, confidence, overrides_applied, routing_decisions, raw_ai_output->>'is_emergency_context' as emergency_context
        FROM incident_audit_trail 
        ORDER BY created_at DESC 
        LIMIT 5
    `);
    
    audits.rows.forEach(a => {
        console.log(`\nОтчет #${a.report_id}:`);
        console.log(`Уверенность ИИ (Confidence): ${a.confidence}`);
        console.log(`Контекст экстренной ситуации: ${a.emergency_context}`);
        console.log(`Примененные оверрайды:`, a.overrides_applied);
        console.log(`Маршрутизация (SLA/Команда):`, a.routing_decisions);
    });

    process.exit(0);
}

check();
