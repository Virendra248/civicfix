const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Register citizen
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone, ward_id } = req.body;
        
        // Check if user exists
        const [existing] = await pool.query('SELECT id FROM citizens WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email already registered' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert citizen
        const [result] = await pool.query(
            'INSERT INTO citizens (email, password_hash, first_name, last_name, phone, ward_id) VALUES (?, ?, ?, ?, ?, ?)',
            [email, hashedPassword, firstName, lastName, phone, ward_id]
        );

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            userId: result.insertId
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Get citizen
        const [citizens] = await pool.query('SELECT * FROM citizens WHERE email = ?', [email]);
        if (citizens.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const citizen = citizens[0];

        // Check password
        const validPassword = await bcrypt.compare(password, citizen.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { id: citizen.id, email: citizen.email, role: 'citizen' },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: citizen.id,
                name: `${citizen.first_name} ${citizen.last_name}`,
                email: citizen.email,
                ward_id: citizen.ward_id
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

module.exports = router;