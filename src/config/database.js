const mysql = require('mysql2');

/**
 * Creates a MySQL connection pool using environment variables.
 * Designed for both local and AWS RDS environments.
 */
const pool = mysql.createPool({
    connectionLimit: 10,
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    // Add SSL support for RDS if needed
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : null
});

module.exports = pool.promise();
