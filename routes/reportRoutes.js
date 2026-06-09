// routes/reportRoutes.js
// Handles: Create, Read, Update status, Delete reports

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const { analyzeIncident, detectCrisis } = require('../services/aiService');
const { getDistrictId } = require('../services/districtService');
const { logTimelineEvent } = require('../services/timelineService');
const RateLimitService = require('../services/RateLimitService');
const DuplicateDetectionService = require('../services/DuplicateDetectionService');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// ==================== CREATE REPORT ====================
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'You must be logged in to submit a report.' });
        }

        const allowed = await RateLimitService.canCreateReport(req.ip, req.session.userId, req.session.userRole);
        if (!allowed) {
            return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' });
        }

        let { category, title, description, location, latitude, longitude } = req.body;
        let image_url = req.body.image_url || null;
        let severity = 'medium'; // default
        let status = 'pending';
        let severityScore = 0;
        let confidence = 100;
        let routingDecision = 'VOLUNTEER_WITH_ADMIN_MONITORING';
        let aiReasoning = '';
        let humanSafetyRisk = 0;
        let infrastructureDamage = 0;
        let publicImpact = 0;
        let urgencyIndicators = 0;
        let evidenceScore = 0;
        let spamProbability = 0;
        let aiResult = null;

        if (req.file) {
            image_url = '/uploads/' + req.file.filename;
            evidenceScore += 4; // Basic evidence score for having an image
        }

        // Get District
        const districtId = await getDistrictId(latitude, longitude);

        let aiClassified = false;
        let isValid = true;
        let isEmergencyOverride = false;

        // Call AI Service if description exists
        if (description) {
            aiResult = await analyzeIncident(description);
            if (aiResult) {
                isValid = aiResult.isValid !== false;
                spamProbability = aiResult.spamProbability || 0;

                if (!isValid) {
                    return res.status(400).json({ error: 'Your report does not describe a valid city problem or incident.' });
                }

                category = aiResult.category || category;
                humanSafetyRisk = aiResult.humanSafetyRisk || 0;
                infrastructureDamage = aiResult.infrastructureDamage || 0;
                publicImpact = aiResult.publicImpact || 0;
                urgencyIndicators = aiResult.urgencyIndicators || 0;
                evidenceScore = Math.max(evidenceScore, aiResult.evidenceScore || 0);
                aiReasoning = aiResult.reasoning || '';
                confidence = aiResult.confidence !== undefined ? aiResult.confidence : 100;

                if (aiResult.reasoning && aiResult.department) {
                    description += `\n\n[AI Assessment]: Routed to ${aiResult.department}. ${aiResult.reasoning}`;
                }
                aiClassified = true;
            }

            // Emergency Keyword Override
            const criticalKeywords = ["fire", "explosion", "building collapse", "gas leak", "electrocution", "serious accident"];
            const descLower = description.toLowerCase();
            for (const kw of criticalKeywords) {
                if (descLower.includes(kw)) {
                    if (!aiClassified || aiResult.is_emergency_context === true) {
                        isEmergencyOverride = true;
                        break;
                    }
                }
            }
        }

        // Fallbacks
        if (!category) category = 'other';

        // Backend Scoring Engine
        severityScore = humanSafetyRisk + infrastructureDamage + publicImpact + urgencyIndicators + evidenceScore;
        
        if (isEmergencyOverride) {
            severityScore = Math.max(85, severityScore);
        }

        // Duplicate Detection Step
        let duplicateOf = null;
        let duplicateConfidence = null;
        const dupResult = await DuplicateDetectionService.detectDuplicate({
            title, description, category, latitude, longitude
        });
        
        if (dupResult && dupResult.confidence >= 60) {
            duplicateConfidence = dupResult.confidence;
            if (dupResult.confidence >= 85) {
                duplicateOf = dupResult.duplicate_of;
                publicImpact += 5; // Increase severity via public impact
            }
        }

        // Spam Check
        let assignedTeam = null;
        let slaTargetHours = null;

        if (aiAnalysis && aiAnalysis.isValid === false) {
            status = 'rejected';
            routingDecision = 'SYSTEM_REJECTED';
            severity = 'low';
        } else if (spamProbability > 70) {
            status = 'pending_admin_review';
            routingDecision = 'ADMIN_REVIEW_REQUIRED';
        } else {
            // Determine Routing and Status based on Score
            if (severityScore <= 30) {
                severity = 'low';
                routingDecision = 'VOLUNTEER_AUTO_ASSIGN';
                assignedTeam = 'Volunteers';
                slaTargetHours = 72;
            } else if (severityScore <= 60) {
                severity = 'medium';
                routingDecision = 'VOLUNTEER_WITH_ADMIN_MONITORING';
                assignedTeam = 'Public Works / General';
                slaTargetHours = 24;
            } else if (severityScore <= 80) {
                severity = 'high';
                routingDecision = 'ADMIN_REVIEW_REQUIRED';
                status = 'awaiting_admin_review';
                assignedTeam = 'Specialized Responders';
                slaTargetHours = 4;
            } else {
                severity = 'critical';
                assignedTeam = 'Emergency Services';
                slaTargetHours = 1;
                if (confidence < 50) {
                    routingDecision = 'ADMIN_REVIEW_REQUIRED';
                    status = 'REQUIRES_REVIEW';
                } else {
                    routingDecision = 'EMERGENCY_ESCALATION';
                }
            }
        }

        const result = await db.query(
            `INSERT INTO reports (user_id, category, title, description, severity, location, latitude, longitude, status, image_url, district_id, severity_score, confidence, routing_decision, ai_reasoning, human_safety_risk, infrastructure_damage, public_impact, urgency_indicators, evidence_score, spam_probability, duplicate_of, severity_engine_version, sla_target_hours, assigned_team)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, 'v2.1', $23, $24)
             RETURNING id, category, title, severity, status, image_url, created_at, district_id`,
            [
                req.session.userId,
                category,
                title || '',
                description || '',
                severity,
                location || '',
                latitude || null,
                longitude || null,
                status,
                image_url || null,
                districtId,
                severityScore,
                confidence,
                routingDecision,
                aiReasoning,
                humanSafetyRisk,
                infrastructureDamage,
                publicImpact,
                urgencyIndicators,
                evidenceScore,
                spamProbability,
                duplicateOf,
                slaTargetHours,
                assignedTeam
            ]
        );

        const report = result.rows[0];

        // Audit Trail Logging
        await db.query(
            `INSERT INTO incident_audit_trail (report_id, raw_ai_output, confidence, score_components, overrides_applied, duplicate_detection_results, routing_decisions)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                report.id, 
                aiResult || {}, 
                confidence, 
                { humanSafetyRisk, infrastructureDamage, publicImpact, urgencyIndicators, evidenceScore, spamProbability }, 
                { isEmergencyOverride }, 
                dupResult || null, 
                { severityScore, routingDecision, severity, slaTargetHours, assignedTeam }
            ]
        );

        if (duplicateOf) {
            await db.query(`UPDATE reports SET engagement_count = engagement_count + 1, citizen_concern_score = citizen_concern_score + 5 WHERE id = $1`, [duplicateOf]);
            await logTimelineEvent('report', duplicateOf, `Linked to new duplicate report #${report.id}`);
            await logTimelineEvent('report', report.id, `Identified as duplicate of incident #${duplicateOf}`);
        }

        // 1. Timeline: Reported
        await logTimelineEvent('report', report.id, 'Citizen reported incident');
        
        // 2. Timeline: AI Actions
        if (aiClassified) {
            await logTimelineEvent('report', report.id, 'AI_ANALYSIS_COMPLETED');
            if (routingDecision === 'VOLUNTEER_AUTO_ASSIGN') {
                await logTimelineEvent('report', report.id, 'AUTO_ASSIGNED_TO_VOLUNTEER');
            } else if (status === 'awaiting_admin_review') {
                await logTimelineEvent('report', report.id, 'AWAITING_ADMIN_REVIEW');
                await logTimelineEvent('report', report.id, 'ADMIN_ALERT_CREATED');
            } else if (routingDecision === 'EMERGENCY_ESCALATION') {
                await logTimelineEvent('report', report.id, 'EMERGENCY_ESCALATION_TRIGGERED');
                await logTimelineEvent('report', report.id, 'ADMIN_ALERT_CREATED');
            } else if (status === 'REQUIRES_REVIEW') {
                await logTimelineEvent('report', report.id, 'FLAGGED FOR MANUAL REVIEW (High Severity / Low Confidence)');
                await logTimelineEvent('report', report.id, 'ADMIN_ALERT_CREATED');
            }
        }

        // 3. Check for Crisis
        if (districtId && status !== 'invalid' && status !== 'pending_admin_review') {
            const recentReports = await db.query(`
                SELECT id, title, description, category, severity FROM reports 
                WHERE district_id = $1 AND crisis_event_id IS NULL AND created_at > NOW() - INTERVAL '1 hour' AND status != 'invalid'
            `, [districtId]);

            if (recentReports.rows.length >= 3) {
                const crisis = await detectCrisis(recentReports.rows);
                if (crisis && crisis.is_crisis) {
                    const crisisRes = await db.query(`
                        INSERT INTO crisis_events (title, description, district_id, severity) 
                        VALUES ($1, $2, $3, $4) RETURNING id
                    `, [crisis.title, crisis.description, districtId, crisis.severity || 'high']);
                    const crisisId = crisisRes.rows[0].id;

                    await logTimelineEvent('crisis', crisisId, 'AI detected emerging crisis event from clustered reports');

                    const reportIds = recentReports.rows.map(r => r.id);
                    await db.query(`UPDATE reports SET crisis_event_id = $1 WHERE id = ANY($2::int[])`, [crisisId, reportIds]);
                    
                    for (const rId of reportIds) {
                        await logTimelineEvent('report', rId, `Linked to Crisis Event #${crisisId}`);
                    }
                }
            }
        }

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
                // Accept the task: assign to current user atomically
                const updateRes = await db.query(
                    'UPDATE reports SET status = $1, assignee_id = $2 WHERE id = $3 AND (assignee_id IS NULL OR assignee_id = $2) RETURNING id',
                    [status, userId, reportId]
                );
                if (updateRes.rowCount === 0) {
                    return res.status(409).json({ error: 'This task has already been accepted by another person.' });
                }
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

        // Timeline Logging
        let timelineAction = '';
        if (status === 'in_progress') timelineAction = `Volunteer ${req.session.userName} assigned to task`;
        else if (status === 'resolved') timelineAction = `Task resolved by ${req.session.userName}`;
        else if (status === 'pending') timelineAction = `Task released by ${req.session.userName}`;
        else timelineAction = `Status updated to ${status} by Admin`;

        await logTimelineEvent('report', reportId, timelineAction);

        // Check Crisis Auto-Resolution
        if (status === 'resolved') {
            await db.query('UPDATE reports SET resolved_at = NOW() WHERE id = $1', [reportId]);
            if (report.crisis_event_id) {
                const crisisId = report.crisis_event_id;
                const unresolvedCount = await db.query(`
                    SELECT COUNT(*) FROM reports WHERE crisis_event_id = $1 AND status != 'resolved' AND status != 'invalid'
                `, [crisisId]);

                if (parseInt(unresolvedCount.rows[0].count) === 0) {
                    await db.query(`UPDATE crisis_events SET status = 'Resolved', resolved_at = NOW() WHERE id = $1`, [crisisId]);
                    await logTimelineEvent('crisis', crisisId, 'All related tasks resolved. Crisis Event closed.');
                }
            }
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
