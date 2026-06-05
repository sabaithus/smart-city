const fs = require('fs');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://postgres:1234@db.smppuqqfevjeuchquuyt.supabase.co:5432/postgres",
});

const schema = fs.readFileSync('./models/schema.sql', 'utf8');

pool.query(schema)
    .then(() => {
        console.log('✅ Schema executed successfully on Supabase!');
        process.exit(0);
    })
    .catch((err) => {
        console.error('❌ Error executing schema:', err.message);
        process.exit(1);
    });
