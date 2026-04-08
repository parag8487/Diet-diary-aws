const db = require('../config/database');

/**
 * Controller for user authentication and management.
 */
class UserController {
    async signup(req, res) {
        const { username, password } = req.body;
        try {
            const query = 'INSERT INTO customers (username, password) VALUES (?, ?)';
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
            const query = 'SELECT * FROM customers WHERE username = ? AND password = ?';
            const [results] = await db.query(query, [username, password]);

            if (results.length > 0) {
                await db.query('UPDATE customers SET last_login = NOW() WHERE username = ?', [username]);
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
            const [results] = await db.query('SELECT username, last_login FROM customers');
            res.json(results);
        } catch (error) {
            res.status(500).send('Error fetching customers: ' + error.message);
        }
    }

    async deleteCustomer(req, res) {
        const username = req.params.username;
        try {
            // First, delete all meals for this user
            await db.query('DELETE FROM meals WHERE username = ?', [username]);
            // Then, delete the user from customers
            await db.query('DELETE FROM customers WHERE username = ?', [username]);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Error deleting customer: ' + error.message });
        }
    }
}

module.exports = new UserController();
