require('dotenv').config();
const db = require('./config/database');

async function removeDuplicates() {
    try {
        console.log("Removing duplicate fire incidents...");
        await db.query(`DELETE FROM reports WHERE category = 'fire' AND id NOT IN (SELECT MIN(id) FROM reports WHERE category = 'fire')`);
        console.log("Deleted duplicate fire incidents successfully");
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}
removeDuplicates();
