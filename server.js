const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('login-form'));
app.use('/todo-list', express.static('todolist'));

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

// Registration Query Functions
const RegistrationQueries = {
    // Register a new user from web
    async registerUser(userData, clientInfo = {}) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Insert user (password stored as plain text)
            const insertUserQuery = `
                INSERT INTO users (full_name, email, username, password, phone, address, date_of_birth)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id, full_name, email, username, created_at;
            `;
            
            const userValues = [
                userData.fullName,
                userData.email,
                userData.username,
                userData.password, // Store password as plain text
                userData.phone || null,
                userData.address || null,
                userData.dateOfBirth || null
            ];
            
            const userResult = await client.query(insertUserQuery, userValues);
            const newUser = userResult.rows[0];
            
            // Insert registration info
            const insertRegInfoQuery = `
                INSERT INTO registration_info (user_id, registration_source, ip_address, user_agent)
                VALUES ($1, $2, $3, $4)
                RETURNING registration_date, is_verified;
            `;
            
            const regInfoValues = [
                newUser.id,
                clientInfo.source || 'web',
                clientInfo.ipAddress || null,
                clientInfo.userAgent || null
            ];
            
            const regInfoResult = await client.query(insertRegInfoQuery, regInfoValues);
            
            await client.query('COMMIT');
            
            return {
                success: true,
                user: {
                    id: newUser.id,
                    fullName: newUser.full_name,
                    email: newUser.email,
                    username: newUser.username,
                    createdAt: newUser.created_at
                },
                registrationInfo: regInfoResult.rows[0]
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },
    
    // Check if user exists (by email or username)
    async checkUserExists(email, username) {
        const query = `
            SELECT id, email, username 
            FROM users 
            WHERE email = $1 OR username = $2;
        `;
        
        const result = await pool.query(query, [email, username]);
        return result.rows;
    },
    
    // Get user by email for login
    async getUserByEmail(email) {
        const query = `
            SELECT u.*, ri.registration_date, ri.is_verified, ri.registration_source
            FROM users u
            LEFT JOIN registration_info ri ON u.id = ri.user_id
            WHERE u.email = $1;
        `;
        
        const result = await pool.query(query, [email]);
        return result.rows[0] || null;
    },
    
    // Get user by username for login
    async getUserByUsername(username) {
        const query = `
            SELECT u.*, ri.registration_date, ri.is_verified, ri.registration_source
            FROM users u
            LEFT JOIN registration_info ri ON u.id = ri.user_id
            WHERE u.username = $1;
        `;
        
        const result = await pool.query(query, [username]);
        return result.rows[0] || null;
    },
    
    // Get all users (for admin panel)
    async getAllUsers() {
        const query = `
            SELECT 
                u.id, u.full_name, u.email, u.username, u.phone, u.address, 
                u.date_of_birth, u.created_at, u.updated_at,
                ri.registration_date, ri.is_verified, ri.registration_source
            FROM users u
            LEFT JOIN registration_info ri ON u.id = ri.user_id
            ORDER BY u.created_at DESC;
        `;
        
        const result = await pool.query(query);
        return result.rows;
    },
    
    // Search users (for admin panel)
    async searchUsers(searchTerm) {
        const query = `
            SELECT 
                u.id, u.full_name, u.email, u.username, u.phone, u.created_at,
                ri.is_verified, ri.registration_source
            FROM users u
            LEFT JOIN registration_info ri ON u.id = ri.user_id
            WHERE 
                u.full_name ILIKE $1 OR 
                u.email ILIKE $1 OR 
                u.username ILIKE $1
            ORDER BY u.created_at DESC;
        `;
        
        const result = await pool.query(query, [`%${searchTerm}%`]);
        return result.rows;
    },
    
    // Get registration statistics (for admin panel)
    async getRegistrationStats() {
        const query = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN ri.is_verified = true THEN 1 END) as verified_users,
                COUNT(CASE WHEN ri.is_verified = false THEN 1 END) as unverified_users,
                COUNT(CASE WHEN u.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as users_last_7_days,
                COUNT(CASE WHEN u.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as users_last_30_days
            FROM users u
            LEFT JOIN registration_info ri ON u.id = ri.user_id;
        `;
        
        const result = await pool.query(query);
        return result.rows[0];
    }
};

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login-form', 'index.html'));
});

app.get('/todo-list', (req, res) => {
    res.sendFile(path.join(__dirname, 'todolist', 'index.html'));
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
