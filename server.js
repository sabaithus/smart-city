// server.js — Entry point for Smart City application
// This file only sets up middleware and loads routes.
// All actual logic is in routes/ folder.

require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.SERVER_PORT || 3000;

// ==================== MIDDLEWARE ====================

// Parse JSON and form data from requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session management (keeps users logged in)
app.use(session({
    secret: process.env.SESSION_SECRET || 'smart-city-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
}));

// Serve frontend files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// ==================== ROUTES ====================

// Auth routes: /api/register, /api/login, /api/me, /api/logout, /api/users
app.use('/api', require('./routes/authRoutes'));

// Report routes: /api/reports (create, list, update status, delete)
app.use('/api/reports', require('./routes/reportRoutes'));

// Map routes: /api/map/markers, /api/map/stats
app.use('/api/map', require('./routes/mapRoutes'));

// Fallback: serve index.html for any unknown route (SPA behavior)
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==================== START SERVER ====================

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log('');
        console.log('  ╔══════════════════════════════════════════════╗');
        console.log('  ║                                              ║');
        console.log('  ║   🏙️  Smart City Server is running!          ║');
        console.log(`  ║   🌐  Open: http://localhost:${PORT}             ║`);
        console.log('  ║                                              ║');
        console.log('  ╚══════════════════════════════════════════════╝');
        console.log('');
    });
}

module.exports = app;
