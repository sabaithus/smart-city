const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini API client if key is provided
let ai = null;
if (process.env.GEMINI_API_KEY) {
    try {
        ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
        console.warn('Failed to initialize GoogleGenAI. AI features will be disabled.', e.message);
    }
}

/**
 * Analyze incident description and return categorized priority.
 * @param {string} description - The text description of the incident
 * @returns {Promise<Object|null>} - Returns { category, severity, department, reasoning } or null on failure
 */
async function analyzeIncident(description) {
    if (!ai || !description || description.trim() === '') {
        return null;
    }

    try {
        const prompt = `
You are an AI assistant for a Smart City emergency and incident reporting platform.
Analyze the following incident description reported by a citizen.

Determine the appropriate Category, Priority (Severity), and Department to handle it.
Categories allowed: "fire", "flooding", "road hazard", "accident", "power outage", "medical", "crime", "other"
Priorities allowed: "low", "medium", "high"

Incident Description: "${description}"

Respond ONLY with a valid JSON object matching this structure:
{
    "category": "...",
    "severity": "...",
    "department": "...",
    "reasoning": "..."
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        const jsonText = response.text;
        const result = JSON.parse(jsonText);
        
        // Ensure standard severities
        if (!['low', 'medium', 'high'].includes(result.severity)) {
            result.severity = 'medium';
        }
        
        return result;
    } catch (error) {
        console.error('AI Analysis failed:', error.message);
        return null;
    }
}

/**
 * Detect if a set of reports constitutes a larger crisis.
 * @param {Array} reports - Array of report objects
 * @returns {Promise<Object|null>} - { is_crisis: true/false, title, description, severity }
 */
async function detectCrisis(reports) {
    if (!ai || !reports || reports.length < 3) {
        return null;
    }

    try {
        const reportText = reports.map(r => `- [${r.category}] ${r.title}: ${r.description}`).join('\n');
        
        const prompt = `
You are the Smart City Intelligence Engine.
Analyze the following recent citizen reports from the same district.
Determine if these incidents are related and form a single unified Crisis Event (e.g., a major fire, a severe grid failure, a coordinated attack, natural disaster).

Reports:
${reportText}

Respond ONLY with a valid JSON object matching this structure:
{
    "is_crisis": true or false,
    "title": "Short title of the crisis (if true)",
    "description": "Summary of the crisis based on the reports (if true)",
    "severity": "high" or "critical" (if true)
}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        const result = JSON.parse(response.text);
        return result;
    } catch (error) {
        console.error('AI Crisis Detection failed:', error.message);
        return null;
    }
}

module.exports = {
    analyzeIncident,
    detectCrisis
};
