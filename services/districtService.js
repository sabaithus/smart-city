const db = require('../config/database');

let cachedDistricts = null;

async function loadDistricts() {
    try {
        const res = await db.query('SELECT * FROM districts');
        cachedDistricts = res.rows;
    } catch (e) {
        console.error('Failed to load districts:', e);
    }
}

async function getDistrictId(lat, lng) {
    if (!cachedDistricts) await loadDistricts();
    if (!cachedDistricts || cachedDistricts.length === 0) return null;

    if (!lat || !lng) return cachedDistricts[0].id; // Fallback

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    for (const d of cachedDistricts) {
        if (!d.bounds_json) continue;
        const b = d.bounds_json; // pg driver automatically parses JSONB
        if (latNum >= b.latMin && latNum <= b.latMax && lngNum >= b.lngMin && lngNum <= b.lngMax) {
            return d.id;
        }
    }

    // If no exact match, return the first one as fallback for demo
    return cachedDistricts[0].id;
}

module.exports = {
    getDistrictId,
    loadDistricts
};
