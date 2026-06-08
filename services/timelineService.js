const db = require('../config/database');

/**
 * Log an event to the timeline
 * @param {string} entityType - 'report' or 'crisis'
 * @param {number} entityId - The ID of the report or crisis
 * @param {string} action - Description of the action (e.g. "Reported", "AI Classified", "Assigned")
 */
async function logTimelineEvent(entityType, entityId, action) {
    try {
        await db.query(
            'INSERT INTO event_timeline (entity_type, entity_id, action) VALUES ($1, $2, $3)',
            [entityType, entityId, action]
        );
    } catch (e) {
        console.error('Failed to log timeline event:', e);
    }
}

/**
 * Get full timeline for a specific entity
 */
async function getTimeline(entityType, entityId) {
    try {
        const res = await db.query(
            'SELECT * FROM event_timeline WHERE entity_type = $1 AND entity_id = $2 ORDER BY timestamp ASC',
            [entityType, entityId]
        );
        return res.rows;
    } catch (e) {
        console.error('Failed to get timeline:', e);
        return [];
    }
}

module.exports = {
    logTimelineEvent,
    getTimeline
};
