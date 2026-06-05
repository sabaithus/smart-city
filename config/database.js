// config/database.js
// PostgreSQL connection using the 'pg' library.
// Reads database settings from .env file.

const { Pool } = require('pg');

// Create a connection pool (reuses connections for better performance)
// When POSTGRES_URL is set (e.g. on Vercel), parse it into individual params.
// Otherwise fall back to individual params for local development.
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

let poolConfig;

if (connectionString) {
    // Parse the URL manually to handle usernames with dots (e.g. postgres.projectid)
    const url = new URL(connectionString);
    poolConfig = {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1), // remove leading /
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        ssl: { rejectUnauthorized: false }
    };
    console.log('  📡 DB connecting to:', url.hostname, 'as user:', url.username);
} else {
    poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'smartcity',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        ssl: false
    };
}

const pool = new Pool(poolConfig);

// Test the connection when the server starts
pool.query('SELECT NOW()')
    .then(() => {
        console.log('  ✅ PostgreSQL connected successfully.');
    })
    .catch((err) => {
        console.error('  ❌ PostgreSQL connection failed:', err.message);
        console.error('     Make sure PostgreSQL is running and the .env settings are correct.');
    });

// Export the pool so routes can use pool.query(...)
module.exports = pool;
