/**
 * RDS MySQL Initialization Script
 * Creates the necessary tables for the Diet-diary project.
 * Run this after setting up your RDS instance and updating .env
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function initDB() {
    console.log("--- RDS Initialization Started ---");
    
    // Check credentials
    if (!process.env.DB_HOST) {
        console.error("❌ ERROR: DB_HOST not found in environment variables.");
        console.log("Please ensure your .env file is set up or Secrets Manager is configured.");
        process.exit(1);
    }

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER || 'admin',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'diet_diary',
        port: process.env.DB_PORT || 3306
    });

    try {
        console.log("🔗 Connected to RDS. Creating tables...");

        // 1. Users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                role VARCHAR(50) DEFAULT 'customer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ 'users' table ready.");

        // 2. Food Items table (The master database)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS food_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                calories INT,
                carbs FLOAT,
                fat FLOAT,
                protein FLOAT,
                image_url TEXT,
                category VARCHAR(100),
                created_by INT,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        `);
        console.log("✅ 'food_items' table ready.");

        // 3. Meal Logs table (User daily tracking)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS meal_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT,
                day VARCHAR(50),
                meal_type VARCHAR(50),
                food_id INT,
                servings FLOAT DEFAULT 1,
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (food_id) REFERENCES food_items(id)
            )
        `);
        console.log("✅ 'meal_logs' table ready.");

        console.log("\n🚀 Database successfully initialized for Diet Diary Cloud Lab!");
    } catch (err) {
        console.error("❌ RDS Init Error:", err.message);
    } finally {
        await connection.end();
        process.exit();
    }
}

initDB();
