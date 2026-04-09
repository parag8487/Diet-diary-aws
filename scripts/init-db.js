/**
 * RDS MySQL Initialization Script
 * Creates the necessary tables for the Diet-diary project.
 */

const secretsService = require('../src/services/secrets.service');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDB() {
    console.log("--- RDS Initialization Started ---");
    
    // Load secrets from AWS Secrets Manager if configured
    try {
        await secretsService.loadSecrets();
    } catch (err) {
        console.warn("⚠️ Warning: Failed to load secrets from AWS. Falling back to .env");
    }
    
    // Check credentials
    if (!process.env.DB_HOST) {
        console.error("❌ ERROR: DB_HOST not found in environment variables.");
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

        // 1. Users table (Standardized)
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

        // 2. Food Items table (Aligned with FoodController)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS food_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                calories INT,
                carbs FLOAT,
                fat FLOAT,
                protein FLOAT,
                url TEXT,
                day VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("✅ 'food_items' table ready.");

        // 3. Meals table (JSON-based for FoodController compatibility)
        await connection.query(`
            CREATE TABLE IF NOT EXISTS meals (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL,
                day VARCHAR(50) NOT NULL,
                data JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (username),
                INDEX (day)
            )
        `);
        console.log("✅ 'meals' table ready.");

        // 4. Seed food_items with data/foods.json if empty
        const fs = require('fs');
        const path = require('path');
        const foodsPath = path.join(__dirname, '../data/foods.json');
        if (fs.existsSync(foodsPath)) {
            const [rows] = await connection.query('SELECT COUNT(*) as count FROM food_items');
            if (rows[0].count === 0) {
                console.log("📥 Seeding food_items from foods.json...");
                const foods = JSON.parse(fs.readFileSync(foodsPath, 'utf8'));
                const insertQuery = `INSERT INTO food_items (title, calories, carbs, fat, protein, url, day) VALUES (?, ?, ?, ?, ?, ?, ?)`;
                for (const food of foods) {
                    await connection.query(insertQuery, [
                        food.title,
                        parseInt(food.calories) || 0,
                        parseFloat(food.carbs) || 0,
                        parseFloat(food.fat) || 0,
                        parseFloat(food.protein) || 0,
                        food.imageUrl || '',
                        'Any' // Default day
                    ]);
                }
                console.log("✅ 'food_items' table seeded successfully.");
            } else {
                console.log("ℹ️ 'food_items' table already contains data, skipping seed.");
            }
        }

        console.log("\n🚀 Database successfully initialized for Diet Diary!");
    } catch (err) {
        console.error("❌ RDS Init Error:", err.message);
    } finally {
        await connection.end();
        process.exit();
    }
}

initDB();
