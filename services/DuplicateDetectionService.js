/**
 * DuplicateDetectionService.js
 * 
 * Step 1: Deterministic Filtering (find nearby recent reports)
 * Step 2: AI Similarity Evaluation
 * Step 3: Returns results for deterministic business logic handling
 */

const db = require('../config/database');
const { evaluateDuplicate } = require('./aiService');

class DuplicateDetectionService {
    /**
     * Find potential duplicates for a new report.
     * @param {Object} newReport - { title, description, category, latitude, longitude }
     * @returns {Promise<Object>} - { duplicate_of: id, confidence: 0-100, reasoning, sameIncident: true/false } or null
     */
    static async detectDuplicate(newReport) {
        if (!newReport.latitude || !newReport.longitude) {
            return null; // Cannot calculate distance without coordinates
        }

        // STEP 1: Deterministic Filtering
        // Find reports created in last 24 hours, not invalid
        // Postgres Haversine approximation (earthdistance/cube not guaranteed, so we use math or simpler bounds)
        // Since we don't know if postgis is installed, we do a basic box query then exact math in JS for safety, 
        // OR we use the database math. Let's do a fast bounding box in SQL, then precise in JS.
        // 500m is ~0.0045 degrees.
        const lat = parseFloat(newReport.latitude);
        const lng = parseFloat(newReport.longitude);
        const latDelta = 0.005;
        const lngDelta = 0.005;

        const candidatesRes = await db.query(`
            SELECT id, title, description, category, status, latitude, longitude
            FROM reports
            WHERE created_at > NOW() - INTERVAL '24 hours'
            AND status != 'invalid'
            AND latitude BETWEEN $1 AND $2
            AND longitude BETWEEN $3 AND $4
            ORDER BY created_at DESC
            LIMIT 10
        `, [lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta]);

        let candidates = candidatesRes.rows;

        // Precise JS Haversine distance filtering (within 500m)
        candidates = candidates.filter(c => {
            if (!c.latitude || !c.longitude) return false;
            const dist = this.getDistanceFromLatLonInM(lat, lng, c.latitude, c.longitude);
            return dist <= 500;
        });

        if (candidates.length === 0) {
            return null; // No candidates found
        }

        // STEP 2: AI Similarity Evaluation
        const evaluation = await evaluateDuplicate(newReport, candidates);
        if (!evaluation) {
            return null;
        }

        return {
            duplicate_of: evaluation.candidateId,
            confidence: evaluation.duplicateConfidence,
            reasoning: evaluation.reasoning,
            sameIncident: evaluation.sameIncident
        };
    }

    static getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Radius of the earth in meters
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in meters
    }

    static deg2rad(deg) {
        return deg * (Math.PI / 180);
    }
}

module.exports = DuplicateDetectionService;
