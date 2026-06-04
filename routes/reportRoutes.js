// routes/reportRoutes.js
// Handles: Create, Read, Update status, Delete reports

const express = require('express');
const router = express.Router();
const db = require('../config/database');

// ==================== CREATE REPORT ====================
router.post('/', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'You must be logged in to submit a report.' });
        }

        const { category, title, description, severity, location, latitude, longitude } = req.body;

        if (!category) {
            return res.status(400).json({ error: 'Category is required.' });
        }

        const result = await db.query(
            `INSERT INTO reports (user_id, category, title, description, severity, location, latitude, longitude, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
             RETURNING id, category, title, severity, status, created_at`,
            [
                req.session.userId,
                category,
                title || '',
                description || '',
                severity || 'medium',
                location || '',
                latitude || null,
                longitude || null
            ]
        );

        const report = result.rows[0];

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully!',
            report: {
                id: report.id,
                category: report.category,
                title: report.title,
                severity: report.severity,
                status: report.status
            }
        });
    } catch (err) {
        console.error('Create report error:', err);
        res.status(500).json({ error: 'Server error while submitting report.' });
    }
});

// ==================== GET REPORTS ====================
// User sees their own reports, admin sees all reports
router.get('/', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'You must be logged in.' });
        }

        let result;
        if (req.session.userRole === 'admin') {
            result = await db.query(
                `SELECT r.*, u.full_name AS reporter_name
                 FROM reports r
                 LEFT JOIN users u ON r.user_id = u.id
                 ORDER BY r.created_at DESC`
            );
        } else {
            result = await db.query(
                'SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC',
                [req.session.userId]
            );
        }

        res.json(result.rows);
    } catch (err) {
        console.error('Get reports error:', err);
        res.status(500).json({ error: 'Server error while loading reports.' });
    }
});

// ==================== UPDATE REPORT STATUS (admin only) ====================
router.put('/:id/status', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required.' });
        }

        const { status } = req.body;
        const validStatuses = ['pending', 'in_progress', 'resolved', 'invalid'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use: ' + validStatuses.join(', ') });
        }

        const result = await db.query(
            'UPDATE reports SET status = $1 WHERE id = $2 RETURNING id',
            [status, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found.' });
        }

        res.json({ success: true, message: `Report status updated to "${status}".` });
    } catch (err) {
        console.error('Update report status error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// ==================== DELETE REPORT ====================
// Users can delete their own reports, admins can delete any
router.delete('/:id', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'You must be logged in.' });
        }

        let result;
        if (req.session.userRole === 'admin') {
            // Admin can delete any report
            result = await db.query('DELETE FROM reports WHERE id = $1 RETURNING id', [req.params.id]);
        } else {
            // User can only delete their own reports
            result = await db.query(
                'DELETE FROM reports WHERE id = $1 AND user_id = $2 RETURNING id',
                [req.params.id, req.session.userId]
            );
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found or you do not have permission.' });
        }

        res.json({ success: true, message: 'Report deleted.' });
    } catch (err) {
        console.error('Delete report error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
