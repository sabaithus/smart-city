require('dotenv').config();
const fs = require('fs');
const db = require('./config/database');

async function run() {
    if (!fs.existsSync('public/images')) {
        fs.mkdirSync('public/images');
    }
    fs.copyFileSync('C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\b9f235e6-ad7e-4870-a6e5-c6cf757300db\\industrial_fire_1_1780778853333.png', 'public/images/fire1.png');
    fs.copyFileSync('C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\b9f235e6-ad7e-4870-a6e5-c6cf757300db\\industrial_fire_2_1780778864232.png', 'public/images/fire2.png');
    fs.copyFileSync('C:\\Users\\admin\\.gemini\\antigravity-ide\\brain\\b9f235e6-ad7e-4870-a6e5-c6cf757300db\\industrial_fire_3_1780778876864.png', 'public/images/fire3.png');

    const reports = await db.query("SELECT id FROM reports WHERE category = 'fire' ORDER BY id DESC LIMIT 3");
    if (reports.rows.length === 3) {
        await db.query("UPDATE reports SET image_url = '/images/fire1.png' WHERE id = $1", [reports.rows[0].id]);
        await db.query("UPDATE reports SET image_url = '/images/fire2.png' WHERE id = $1", [reports.rows[1].id]);
        await db.query("UPDATE reports SET image_url = '/images/fire3.png' WHERE id = $1", [reports.rows[2].id]);
        console.log("Database updated with photo URLs");
    }
    process.exit(0);
}
run();
