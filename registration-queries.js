const { Pool } = require('pg');
require('dotenv').config({ path: './config.env' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'postgres'
});

class RegistrationQueries {
    
    // Register a new user from web
    static async registerUser(userData, clientInfo = {}) {
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
    }
    
    // Check if user exists (by email or username)
    static async checkUserExists(email, username) {
        const query = `
            SELECT id, email, username 
            FROM users 
            WHERE email = $1 OR username = $2;
        `;
        
        const result = await pool.query(query, [email, username]);
        return result.rows;
    }
    
    // Get user by email for login
    static async getUserByEmail(email) {
        const query = `
            SELECT u.*, ri.registration_date, ri.is_verified, ri.registration_source
            FROM users u
            LEFT JOIN registration_info ri ON u.id = ri.user_id
            WHERE u.email = $1;
        `;
        
        const result = await pool.query(query, [email]);
        return result.rows[0] || null;
    }
    
    // Get user by username for login
    static async getUserByUsername(username) {
        const query = `
            SELECT u.*, ri.registration_date, ri.is_verified, ri.registration_source
            FROM users u
            LEFT JOIN registration_info ri ON u.id = ri.user_id
            WHERE u.username = $1;
        `;
        
        const result = await pool.query(query, [username]);
        return result.rows[0] || null;
    }
    
    // Get all users (for admin panel)
    static async getAllUsers() {
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
    }
    
    // Search users (for admin panel)
    static async searchUsers(searchTerm) {
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
    }
    
    // Get registration statistics (for admin panel)
    static async getRegistrationStats() {
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
}

module.exports = RegistrationQueries;
