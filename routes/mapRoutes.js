// routes/mapRoutes.js
// Handles: Public API for Live Map markers
// This route does NOT require login — map data is public

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==================== GET MAP MARKERS ====================
// Returns all reports that have latitude and longitude
// Used by the Live Map to show pins on the map
router.get('/markers', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT id, user_id, category, title, description, severity, location,
                    latitude, longitude, status, image_url, created_at
             FROM reports
             WHERE latitude IS NOT NULL AND longitude IS NOT NULL
             AND status NOT IN ('rejected', 'pending_admin_review', 'REQUIRES_REVIEW', 'awaiting_admin_review')
             ORDER BY created_at DESC`
        );

        res.json(result.rows);
    } catch (err) {
        console.error('Map markers error:', err);
        res.status(500).json({ error: 'Server error loading map data.' });
    }
});

// ==================== GET DASHBOARD STATS ====================
// Returns counts for the admin dashboard and home page
router.get('/stats', async (req, res) => {
    try {
        const pending = await db.query("SELECT COUNT(*) FROM reports WHERE status = 'pending'");
        const inProgress = await db.query("SELECT COUNT(*) FROM reports WHERE status = 'in_progress'");
        const resolved = await db.query("SELECT COUNT(*) FROM reports WHERE status = 'resolved'");
        const totalUsers = await db.query("SELECT COUNT(*) FROM users");
        const volunteers = await db.query("SELECT COUNT(*) FROM users WHERE role = 'volunteer'");

        res.json({
            pending: parseInt(pending.rows[0].count),
            inProgress: parseInt(inProgress.rows[0].count),
            resolved: parseInt(resolved.rows[0].count),
            totalUsers: parseInt(totalUsers.rows[0].count),
            volunteers: parseInt(volunteers.rows[0].count)
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Server error loading stats.' });
    }
});

module.exports = router;
