/**
 * RateLimitService.js
 * 
 * Abstract service for rate limiting to protect against spam/fraud.
 * Currently uses an in-memory provider.
 * Designed so that future providers (Redis, Database, Cloud) can be swapped in without changing business logic.
 */

class MemoryRateLimitProvider {
    constructor() {
        this.store = {};
    }

    /**
     * Increment usage and check if limit is exceeded.
     * @param {string} key - The unique identifier for the limit (e.g. "report_creation:IP:1.2.3.4" or "report_creation:USER:123")
     * @param {number} limit - Maximum allowed requests
     * @param {number} windowMs - Time window in milliseconds
     * @returns {Promise<boolean>} - True if request is allowed, false if rate limited
     */
    async checkAndIncrement(key, limit, windowMs) {
        const now = Date.now();
        if (!this.store[key]) {
            this.store[key] = { count: 0, resetAt: now + windowMs };
        }

        // Reset if window has passed
        if (now > this.store[key].resetAt) {
            this.store[key] = { count: 0, resetAt: now + windowMs };
        }

        this.store[key].count++;

        if (this.store[key].count > limit) {
            return false; // Rate limited
        }
        return true; // Allowed
    }
}

// Current Implementation Provider
const provider = new MemoryRateLimitProvider();

class RateLimitService {
    /**
     * Checks if a user or IP is allowed to create a report based on role limits.
     * Anonymous: 5 per hour
     * Citizen: 10 per hour
     * Volunteer: 20 per hour
     * Admin/Responder: 50 per hour
     */
    static async canCreateReport(ip, userId, role) {
        const windowMs = 60 * 60 * 1000; // 1 hour
        
        let limit = 5; // Default anonymous
        let key = `report_creation:IP:${ip}`;
        
        if (userId) {
            key = `report_creation:USER:${userId}`;
            if (role === 'admin' || role === 'responder' || role === 'operator') {
                limit = 50;
            } else if (role === 'volunteer') {
                limit = 20;
            } else {
                limit = 10; // Citizen
            }
        }

        return await provider.checkAndIncrement(key, limit, windowMs);
    }
}

module.exports = RateLimitService;
