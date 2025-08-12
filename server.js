const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const RegistrationQueries = require('./registration-queries');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('responsive-login-form'));
app.use('/todo-list', express.static('todo-list'));

// PostgreSQL Connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to PostgreSQL:', err.message);
    } else {
        release();
    }
});

// Create users table if it doesn't exist
const createTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        date_of_birth DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

pool.query(createTableQuery, (err, result) => {
    if (err) {
        console.error('Error creating table:', err);
    }
});

// Create registration info table if it doesn't exist
const createRegistrationInfoQuery = `
    CREATE TABLE IF NOT EXISTS registration_info (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        registration_source VARCHAR(50) DEFAULT 'web',
        ip_address INET,
        user_agent TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(255),
        verification_expires TIMESTAMP
    );
`;

pool.query(createRegistrationInfoQuery, (err, result) => {
    if (err) {
        console.error('Error creating registration_info table:', err);
    }
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'responsive-login-form', 'index.html'));
});

app.get('/todo-list', (req, res) => {
    res.sendFile(path.join(__dirname, 'todo-list', 'index.html'));
});

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { fullName, email, username, password, phone, address, dateOfBirth } = req.body;

        // Validation
        if (!fullName || !email || !username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters long' 
            });
        }

        // Check if user already exists
        const existingUsers = await RegistrationQueries.checkUserExists(email, username);
        if (existingUsers.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email or username already exists' 
            });
        }

        // Register new user
        const userData = {
            fullName,
            email,
            username,
            password,
            phone,
            address,
            dateOfBirth
        };

        const clientInfo = {
            source: 'web',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        };

        const registrationResult = await RegistrationQueries.registerUser(userData, clientInfo);

        res.status(201).json({
            success: true,
            message: 'User registered successfully!',
            user: registrationResult.user
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validation
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }

        // Find user by username or email
        const user = await RegistrationQueries.getUserByUsername(username) || 
                     await RegistrationQueries.getUserByEmail(username);

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Check password (direct comparison since password is stored as plain text)
        const isValidPassword = password === user.password;

        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        res.json({
            success: true,
            message: 'Login successful!',
            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                username: user.username
            }
        });

    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await RegistrationQueries.getAllUsers();
        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Get registration statistics
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await RegistrationQueries.getRegistrationStats();
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Search users
app.get('/api/users/search', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }
        
        const users = await RegistrationQueries.searchUsers(q);
        res.json({
            success: true,
            users: users
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error' 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
