// routes/authRoutes.js
// Handles: Register, Login, Session Check, Logout, List Users (admin)

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// ==================== REGISTER ====================
router.post('/register', async (req, res) => {
    try {
        const { fullName, countryCode, phone, password, role } = req.body;

        // Validation
        if (!fullName || !countryCode || !phone || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        if (phone.length < 7 || phone.length > 15) {
            return res.status(400).json({ error: 'Invalid phone number.' });
        }

        const fullPhone = countryCode + phone;

        // Check if user already exists
        const existing = await db.query('SELECT id FROM users WHERE phone = $1', [fullPhone]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'This phone number is already registered.' });
        }

        // Hash password and save
        const hashedPassword = bcrypt.hashSync(password, 10);
        const userRole = role || 'user';

        const result = await db.query(
            'INSERT INTO users (full_name, phone, password, role) VALUES ($1, $2, $3, $4) RETURNING id',
            [fullName, fullPhone, hashedPassword, userRole]
        );

        const newUserId = result.rows[0].id;

        // Auto-login after registration
        req.session.userId = newUserId;
        req.session.userName = fullName;
        req.session.userRole = userRole;
        req.session.userPhone = fullPhone;

        res.status(201).json({
            success: true,
            message: 'Account created successfully!',
            user: { id: newUserId, fullName, phone: fullPhone, role: userRole }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error during registration.' });
    }
});

// ==================== LOGIN ====================
router.post('/login', async (req, res) => {
    try {
        const { countryCode, phone, password } = req.body;

        if (!countryCode || !phone || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        const fullPhone = countryCode + phone;

        const result = await db.query('SELECT * FROM users WHERE phone = $1', [fullPhone]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found. Please register first.' });
        }

        const user = result.rows[0];
        const isValidPassword = bcrypt.compareSync(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Incorrect password.' });
        }

        // Set session
        req.session.userId = user.id;
        req.session.userName = user.full_name;
        req.session.userRole = user.role;
        req.session.userPhone = user.phone;

        res.json({
            success: true,
            message: 'Logged in successfully!',
            user: { id: user.id, fullName: user.full_name, phone: user.phone, role: user.role }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// ==================== CHECK SESSION ====================
router.get('/me', (req, res) => {
    if (req.session.userId) {
        res.json({
            loggedIn: true,
            user: {
                id: req.session.userId,
                fullName: req.session.userName,
                phone: req.session.userPhone,
                role: req.session.userRole
            }
        });
    } else {
        res.json({ loggedIn: false });
    }
});

// ==================== LOGOUT ====================
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to logout.' });
        }
        res.json({ success: true, message: 'Logged out successfully.' });
    });
});

// ==================== LIST USERS (admin only) ====================
router.get('/users', async (req, res) => {
    try {
        if (!req.session.userId || req.session.userRole !== 'admin') {
            return res.status(403).json({ error: 'Admin access required.' });
        }

        const result = await db.query(
            'SELECT id, full_name, phone, role, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        console.error('List users error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
