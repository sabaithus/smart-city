const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==================== GET KPIs ====================
router.get('/kpis', async (req, res) => {
    try {
        const crisisCountRes = await db.query("SELECT COUNT(*) FROM crisis_events WHERE status != 'Resolved'");
        const criticalCountRes = await db.query("SELECT COUNT(*) FROM reports WHERE severity IN ('high', 'critical') AND status != 'resolved' AND status != 'invalid'");
        
        // Compute average resolution time for all resolved reports
        const avgRes = await db.query("SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_seconds FROM reports WHERE status = 'resolved' AND resolved_at IS NOT NULL");
        let avgSeconds = avgRes.rows[0].avg_seconds || 0;
        
        let avgStr = '0h 0m';
        if (avgSeconds > 0) {
            const hours = Math.floor(avgSeconds / 3600);
            const mins = Math.floor((avgSeconds % 3600) / 60);
            avgStr = `${hours}h ${mins}m`;
        }

        res.json({
            activeCrises: parseInt(crisisCountRes.rows[0].count),
            criticalIncidents: parseInt(criticalCountRes.rows[0].count),
            avgResponse: avgStr
        });
    } catch (err) {
        console.error('KPI error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== GET LIVE EVENT FEED ====================
router.get('/feed', async (req, res) => {
    try {
        const feedRes = await db.query(`
            SELECT id, action, timestamp, entity_type, entity_id 
            FROM event_timeline 
            ORDER BY timestamp DESC LIMIT 20
        `);
        res.json(feedRes.rows);
    } catch (err) {
        console.error('Feed error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== GET TIMELINE FOR ENTITY ====================
router.get('/timeline/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const timelineRes = await db.query(`
            SELECT action, timestamp 
            FROM event_timeline 
            WHERE entity_type = $1 AND entity_id = $2 
            ORDER BY timestamp ASC
        `, [type, id]);
        res.json(timelineRes.rows);
    } catch (err) {
        console.error('Timeline error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ==================== GET ACTIVE CRISES ====================
router.get('/crises', async (req, res) => {
    try {
        const crisesRes = await db.query(`
            SELECT c.*, d.name as district_name 
            FROM crisis_events c 
            LEFT JOIN districts d ON c.district_id = d.id 
            WHERE c.status != 'Resolved'
            ORDER BY c.created_at DESC
        `);
        res.json(crisesRes.rows);
    } catch (err) {
        console.error('Crises error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
