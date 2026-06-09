require('dotenv').config();
const { analyzeIncident } = require('./services/aiService');

async function test() {
    const cases = [
        "My cat is cute and the sky is blue today.", // Should be invalid
        "There is a huge fire and explosion at the main power plant!! People are hurt!", // Should be valid, high scores
        "I want to sell my car for 500 dollars link here http://spam.com" // Should be high spam
    ];

    for (const c of cases) {
        console.log(`\n--- Testing: "${c}" ---`);
        const result = await analyzeIncident(c);
        console.log(JSON.stringify(result, null, 2));
    }
}

test();
