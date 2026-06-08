require('dotenv').config();
const db = require('./config/database');

const query = `
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
`;

async function run() {
    try {
        await db.query(query);
        console.log("Session table created successfully");
        process.exit(0);
    } catch(e) {
        console.error("Error creating session table:", e);
        process.exit(1);
    }
}
run();
