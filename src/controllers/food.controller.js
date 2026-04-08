const db = require('../config/database');

/**
 * Controller for handling food item operations and meal logging.
 */
class FoodController {
    async getAllFoods(req, res) {
        try {
            const [rows] = await db.query('SELECT * FROM food_items');
            res.json(rows);
        } catch (error) {
            res.status(500).json({ error: 'Error reading food data: ' + error.message });
        }
    }

    async saveMealData(req, res) {
        const { username, day, data } = req.body;
        if (!username || !day) return res.status(400).send('Username and day are required');

        try {
            const [results] = await db.query('SELECT * FROM meals WHERE username = ? AND day = ?', [username, day]);

            const query = results.length > 0
                ? 'UPDATE meals SET data = ? WHERE username = ? AND day = ?'
                : 'INSERT INTO meals (data, username, day) VALUES (?, ?, ?)';

            const params = [JSON.stringify(data), username, day];
            await db.query(query, params);

            res.send(results.length > 0 ? 'Data updated' : 'Data inserted');
        } catch (error) {
            res.status(500).send('Error saving data: ' + error.message);
        }
    }

    async saveFoodItem(req, res) {
        const { day, title, url, calories, carbs, fat, protein } = req.body;
        if (!day || !title || !calories || !carbs || !fat || !protein) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        try {
            const query = `INSERT INTO food_items (day, title, url, calories, carbs, fat, protein) 
                           VALUES (?, ?, ?, ?, ?, ?, ?)`;
            await db.query(query, [day, title, url, calories, carbs, fat, protein]);
            res.send('Food item saved to MySQL');
        } catch (error) {
            res.status(500).send('Error saving food: ' + error.message);
        }
    }

    async getWeeklyData(req, res) {
        const username = req.query.username;
        if (!username) return res.status(400).send('Username is required');

        try {
            const query = `SELECT day, data FROM meals WHERE username = ?
                           ORDER BY FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
                           'Friday', 'Saturday', 'Sunday')`;
            const [results] = await db.query(query, [username]);

            const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            const dataMap = {};

            results.forEach(row => {
                const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
                dataMap[row.day] = {
                    calories: data.totalCalories || 0,
                    protein: data.totalProtein || 0
                };
            });

            const calorieData = dayOrder.map(day => dataMap[day]?.calories || 0);
            const proteinData = dayOrder.map(day => dataMap[day]?.protein || 0);

            res.json({ calorieData, proteinData });
        } catch (error) {
            res.status(500).send('Error fetching data: ' + error.message);
        }
    }

    async deleteData(req, res) {
        const username = req.query.username;
        if (!username) return res.status(400).send('Username is required');
        try {
            await db.query('DELETE FROM meals WHERE username = ?', [username]);
            res.send('All meal data deleted for user: ' + username);
        } catch (error) {
            res.status(500).send('Error deleting data: ' + error.message);
        }
    }

    async getFoodByDay(req, res) {
        const { day } = req.params;
        try {
            const [results] = await db.query('SELECT * FROM food_items WHERE day = ?', [day]);
            res.json(results);
        } catch (error) {
            res.status(500).send('Error fetching food: ' + error.message);
        }
    }
}

module.exports = new FoodController();
