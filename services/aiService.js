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
 * Analyze incident description and return categorized risk factors and validation.
 * @param {string} description - The text description of the incident
 * @returns {Promise<Object|null>} - Returns parsed JSON or null on failure
 */
async function analyzeIncident(description) {
    if (!ai || !description || description.trim() === '') {
        return null;
    }

    try {
        const prompt = `
SYSTEM:

You are a Smart City Incident Intelligence Engine.
Your task is to classify citizen reports and extract risk factors, context, and confidence.
Do NOT determine routing, escalation, or final severity. Just provide the analytical factors.

Return ONLY valid JSON.

Rules:
1. Prioritize human safety.
2. Estimate infrastructure damage and public impact.
3. Determine if the context is an actual emergency ("is_emergency_context"). A historical reference (e.g. "there was an explosion last year") is NOT an emergency context.
4. Provide a confidence score (0-100) based on text completeness, location, and visual evidence (assume 0 for visual evidence if no image).
5. Determine if the report is a valid city incident ("isValid"). 
   Set false ONLY for tests, spam, jokes, personal messages.
6. Provide a "spamProbability" from 0 to 100.

Incident Description: "${description}"

Categories allowed: "fire", "flooding", "road hazard", "accident", "power outage", "medical", "crime", "other"
Departments allowed: "Police", "Fire", "Medical", "Public Works", "Utility", "Animal Control", "Other"

Output MUST exactly match this JSON structure:
{
  "isValid": true/false,
  "spamProbability": 0,
  "category": "...",
  "department": "...",
  "humanSafetyRisk": 0,
  "infrastructureDamage": 0,
  "publicImpact": 0,
  "urgencyIndicators": 0,
  "evidenceScore": 0,
  "is_emergency_context": true/false,
  "confidence": 0,
  "reasoning": "..."
}

Risk Scoring Reference:
Human Safety Risk (0-40): No danger=0, Minor inconvenience=5, Potential injury=15, Likely injury=25, Severe injury risk=35, Immediate threat to life=40.
Infrastructure Damage (0-20): None=0, Cosmetic=5, Minor=10, Moderate=15, Severe=20.
Public Impact (0-15): 1-2 people=3, Small neighborhood=7, District=10, Large area=15.
Urgency Indicators (0-15): Normal=0, Urgent wording=5, Danger wording=10, Emergency wording=15.
Evidence Score: default to 0.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        
        const jsonText = response.text;
        const result = JSON.parse(jsonText);
        
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

/**
 * Evaluate if a new report is a semantic duplicate of candidate recent reports.
 * @param {Object} newReport - The new report object
 * @param {Array} candidates - Array of recent nearby reports
 * @returns {Promise<Object|null>} - { candidateId, duplicateConfidence, reasoning, sameIncident }
 */
async function evaluateDuplicate(newReport, candidates) {
    if (!ai || !newReport || !candidates || candidates.length === 0) {
        return null;
    }

    try {
        const candidatesText = candidates.map(c => `ID: ${c.id}\nTitle: ${c.title}\nCategory: ${c.category}\nDescription: ${c.description}\n`).join('\n---\n');

        const prompt = `
You are the Smart City Incident Intelligence Engine.
Your task is to determine if a NEW incident report refers to the EXACT SAME physical incident as any of the previous CANDIDATE reports.
They are already physically close and temporally close. Determine semantic similarity.

NEW REPORT:
Title: ${newReport.title}
Category: ${newReport.category}
Description: ${newReport.description}

CANDIDATES:
${candidatesText}

Respond ONLY with a valid JSON object matching this structure:
{
    "candidateId": <integer ID of the most likely duplicate, or null if none match>,
    "duplicateConfidence": <0-100 score of how likely they are the same incident>,
    "sameIncident": <true/false based on if confidence >= 60>,
    "reasoning": "<short explanation>"
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
        console.error('AI Duplicate Evaluation failed:', error.message);
        return null;
    }
}

module.exports = {
    analyzeIncident,
    detectCrisis,
    evaluateDuplicate
};
