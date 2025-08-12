const { Client } = require('pg');
require('dotenv').config({ path: './config.env' });

const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5433,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'postgres'
});

async function setupDatabase() {
    try {
        // Connect to database
        await client.connect();

        // Create users table
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

        await client.query(createTableQuery);

        // Create additional registration info table
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

        await client.query(createRegistrationInfoQuery);

    } catch (error) {
        console.error('Database setup error:', error.message);
    } finally {
        await client.end();
    }
}

// Run the setup
setupDatabase();
