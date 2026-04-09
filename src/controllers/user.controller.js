const db = require('../config/database');

/**
 * Controller for user authentication and management.
 */
class UserController {
    async signup(req, res) {
        const { username, password } = req.body;
        try {
            const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
            await db.query(query, [username, password]);
            res.json({ success: true });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.json({ success: false, message: 'Username already exists.' });
            }
            res.status(500).json({ success: false, message: 'Error registering: ' + error.message });
        }
    }

    async login(req, res) {
        const { username, password } = req.body;
        try {
            const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
            const [results] = await db.query(query, [username, password]);

            if (results.length > 0) {
                // Check if last_login column exists before updating, or just ignore if it fails
                try {
                    await db.query('UPDATE users SET last_login = NOW() WHERE username = ?', [username]);
                } catch (e) {
                    // last_login might not exist, that's fine
                }
                res.json({ success: true });
            } else {
                res.json({ success: false, message: 'Invalid username or password' });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error logging in: ' + error.message });
        }
    }

    async getCustomers(req, res) {
        try {
            const [results] = await db.query('SELECT username FROM users');
            res.json(results);
        } catch (error) {
            res.status(500).send('Error fetching users: ' + error.message);
        }
    }

    async deleteCustomer(req, res) {
        const username = req.params.username;
        try {
            // First, delete all meals for this user
            await db.query('DELETE FROM meals WHERE username = ?', [username]);
            // Then, delete the user from users
            await db.query('DELETE FROM users WHERE username = ?', [username]);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error deleting user: ' + error.message });
        }
    }
}

module.exports = new UserController();
