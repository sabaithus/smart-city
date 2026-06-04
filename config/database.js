// config/database.js
// PostgreSQL connection using the 'pg' library.
// Reads database settings from .env file.

const { Pool } = require('pg');

// Create a connection pool (reuses connections for better performance)
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'smartcity',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

// Test the connection when the server starts
pool.query('SELECT NOW()')
    .then(() => {
        console.log('  ✅ PostgreSQL connected successfully.');
    })
    .catch((err) => {
        console.error('  ❌ PostgreSQL connection failed:', err.message);
        console.error('     Make sure PostgreSQL is running and the .env settings are correct.');
        process.exit(1);
    });

// Export the pool so routes can use pool.query(...)
module.exports = pool;
