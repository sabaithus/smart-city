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

        const { category, title, description, severity, location, latitude, longitude, image_url } = req.body;

        if (!category) {
            return res.status(400).json({ error: 'Category is required.' });
        }

        const result = await db.query(
            `INSERT INTO reports (user_id, category, title, description, severity, location, latitude, longitude, status, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
             RETURNING id, category, title, severity, status, image_url, created_at`,
            [
                req.session.userId,
                category,
                title || '',
                description || '',
                severity || 'medium',
                location || '',
                latitude || null,
                longitude || null,
                image_url || null
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
                status: report.status,
                image_url: report.image_url
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
        if (req.session.userRole === 'admin' || req.session.userRole === 'volunteer' || req.session.userRole === 'responder') {
            result = await db.query(
                `SELECT r.*, u.full_name AS reporter_name, a.full_name AS assignee_name
                 FROM reports r
                 LEFT JOIN users u ON r.user_id = u.id
                 LEFT JOIN users a ON r.assignee_id = a.id
                 ORDER BY r.created_at DESC`
            );
        } else {
            result = await db.query(
                `SELECT r.*, a.full_name AS assignee_name 
                 FROM reports r
                 LEFT JOIN users a ON r.assignee_id = a.id
                 WHERE r.user_id = $1 
                 ORDER BY r.created_at DESC`,
                [req.session.userId]
            );
        }

        res.json(result.rows);
    } catch (err) {
        console.error('Get reports error:', err);
        res.status(500).json({ error: 'Server error while loading reports.' });
    }
});

// ==================== GET FEED REPORTS ====================
// Filtered based on user role:
// - admin, volunteer, responder: see all reports (no severity filtering)
// - user: all active/resolved reports
router.get('/feed', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'You must be logged in.' });
        }

        const role = req.session.userRole;
        let queryStr = '';

        if (role === 'admin' || role === 'volunteer' || role === 'responder') {
            queryStr = `
                SELECT r.*, u.full_name AS reporter_name, a.full_name AS assignee_name
                FROM reports r
                LEFT JOIN users u ON r.user_id = u.id
                LEFT JOIN users a ON r.assignee_id = a.id
                WHERE r.status != 'invalid'
                ORDER BY r.created_at DESC
            `;
        } else {
            // Citizen (user): sees active/resolved reports
            queryStr = `
                SELECT r.*, u.full_name AS reporter_name, a.full_name AS assignee_name
                FROM reports r
                LEFT JOIN users u ON r.user_id = u.id
                LEFT JOIN users a ON r.assignee_id = a.id
                WHERE r.status != 'invalid'
                ORDER BY r.created_at DESC
            `;
        }

        const result = await db.query(queryStr);
        res.json(result.rows);
    } catch (err) {
        console.error('Get feed error:', err);
        res.status(500).json({ error: 'Server error while loading feed.' });
    }
});

// ==================== UPDATE REPORT STATUS ====================
// Admins can update any status.
// Volunteers/Responders can accept (set to in_progress) or resolve (set to resolved) reports.
router.put('/:id/status', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'You must be logged in.' });
        }

        const reportId = req.params.id;
        const { status } = req.body;
        const validStatuses = ['pending', 'in_progress', 'resolved', 'invalid'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }

        const role = req.session.userRole;
        const userId = req.session.userId;

        // Load the current report to check severity and assignee
        const reportRes = await db.query('SELECT * FROM reports WHERE id = $1', [reportId]);
        if (reportRes.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found.' });
        }
        const report = reportRes.rows[0];

        if (role === 'admin') {
            // Admin can do anything
            await db.query(
                'UPDATE reports SET status = $1 WHERE id = $2',
                [status, reportId]
            );
        } else if (role === 'responder' || role === 'volunteer') {
            // Allowed severity is unrestricted for visibility but can accept any
            if (status === 'in_progress') {
                // Accept the task: assign to current user
                await db.query(
                    'UPDATE reports SET status = $1, assignee_id = $2 WHERE id = $3',
                    [status, userId, reportId]
                );
            } else if (status === 'resolved') {
                // Resolve the task
                // Allow if they are the assignee, or if it wasn't assigned (auto-assign on resolve)
                if (report.assignee_id && report.assignee_id !== userId) {
                    return res.status(403).json({ error: 'This task is assigned to another person.' });
                }
                await db.query(
                    'UPDATE reports SET status = $1, assignee_id = COALESCE(assignee_id, $2) WHERE id = $3',
                    [status, userId, reportId]
                );
            } else if (status === 'pending') {
                // Release the task
                if (report.assignee_id !== userId) {
                    return res.status(403).json({ error: 'You cannot release this task as you are not the assignee.' });
                }
                await db.query(
                    'UPDATE reports SET status = $1, assignee_id = NULL WHERE id = $2',
                    [status, reportId]
                );
            } else {
                return res.status(403).json({ error: 'Invalid operation for your role.' });
            }
        } else {
            return res.status(403).json({ error: 'Citizen users cannot update incident statuses.' });
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
