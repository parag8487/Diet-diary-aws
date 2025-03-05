const express = require('express');
const mysql = require('mysql2');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// ==================== MySQL Configuration ====================
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Admin@2804',
    database: 'diet_diary'
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database');
});

// Create tables if they don't exist
const createTables = () => {
    const queries = [
        `CREATE TABLE IF NOT EXISTS meals (
            id INT AUTO_INCREMENT PRIMARY KEY,
            day VARCHAR(50) NOT NULL,
            data JSON NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS food_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            day VARCHAR(50) NOT NULL,
            title VARCHAR(255) NOT NULL,
            url VARCHAR(255),
            calories INT NOT NULL,
            carbs INT NOT NULL,
            fat INT NOT NULL,
            protein INT NOT NULL
        )`
    ];

    queries.forEach(query => {
        db.query(query, (err) => {
            if (err) console.error('Error creating table:', err);
        });
    });
};
createTables();

// ==================== JSON Storage Configuration ====================
const dataPath = path.join(__dirname, 'data', 'foods.json');

// Initialize JSON file if it doesn't exist
const initializeJSON = async () => {
    try {
        await fs.access(dataPath);
    } catch (error) {
        await fs.writeFile(dataPath, JSON.stringify([]));
        console.log('Created foods.json file');
    }
};
initializeJSON();

// ==================== API Endpoints ====================

// -------------------- MySQL Endpoints --------------------
app.post('/save-data', (req, res) => {
    const { day, data } = req.body;
    const checkQuery = 'SELECT * FROM meals WHERE day = ?';
    
    db.query(checkQuery, [day], (err, results) => {
        if (err) return res.status(500).send('Error checking data: ' + err.message);
        
        const query = results.length > 0 ? 
            'UPDATE meals SET data = ? WHERE day = ?' : 
            'INSERT INTO meals (day, data) VALUES (?, ?)';
        const params = results.length > 0 ? 
            [JSON.stringify(data), day] : 
            [day, JSON.stringify(data)];
            
        db.query(query, params, (err) => {
            if (err) return res.status(500).send('Error saving data: ' + err.message);
            res.send(results.length > 0 ? 'Data updated' : 'Data inserted');
        });
    });
});

app.post('/save-food', (req, res) => {
    const { day, title, url, calories, carbs, fat, protein } = req.body;
    if (!day || !title || !calories || !carbs || !fat || !protein) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const query = `INSERT INTO food_items (day, title, url, calories, carbs, fat, protein) 
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(query, [day, title, url, calories, carbs, fat, protein], (err) => {
        if (err) return res.status(500).send('Error saving food: ' + err.message);
        res.send('Food item saved to MySQL');
    });
});

app.delete('/delete-data', (req, res) => {
    db.query('DELETE FROM meals', (err) => {
        if (err) return res.status(500).send('Error deleting data: ' + err.message);
        res.send('All meal data deleted from MySQL');
    });
});

app.get('/get-weekly-data', (req, res) => {
    const query = `SELECT day, data FROM meals 
                   ORDER BY FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
                   'Friday', 'Saturday', 'Sunday')`;

    db.query(query, (err, results) => {
        if (err) return res.status(500).send('Error fetching data: ' + err.message);

        const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", 
                         "Friday", "Saturday", "Sunday"];
        const dataMap = {};

        results.forEach(row => {
            try {
                const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
                dataMap[row.day] = {
                    calories: data.totalCalories || 0,
                    protein: data.totalProtein || 0
                };
            } catch (error) {
                console.error('Error parsing data for:', row.day, error);
            }
        });

        const calorieData = dayOrder.map(day => dataMap[day]?.calories || 0);
        const proteinData = dayOrder.map(day => dataMap[day]?.protein || 0);

        res.json({ calorieData, proteinData });
    });
});

app.get('/get-food/:day', (req, res) => {
    const { day } = req.params;
    db.query('SELECT * FROM food_items WHERE day = ?', [day], (err, results) => {
        if (err) return res.status(500).send('Error fetching food: ' + err.message);
        res.json(results);
    });
});

// -------------------- JSON Endpoints --------------------
app.get('/api/foods', async (req, res) => {
    try {
        const data = await fs.readFile(dataPath);
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: 'Error reading food data' });
    }
});

app.post('/api/foods', async (req, res) => {
    try {
        const newFood = req.body;
        const data = await fs.readFile(dataPath);
        const foods = JSON.parse(data);
        
        foods.push(newFood);
        await fs.writeFile(dataPath, JSON.stringify(foods, null, 2));
        
        res.status(201).json(newFood);
    } catch (error) {
        res.status(500).json({ error: 'Error saving food data' });
    }
});

//for signup page
app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    const query = 'INSERT INTO customers (username, password) VALUES (?, ?)';
    db.query(query, [username, password], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.json({ success: false, message: 'Username already exists. Please choose a different one.' });
            }
            return res.status(500).json({ success: false, message: 'Error registering: ' + err.message });
        }
        res.json({ success: true });
    });
});

//for login page
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM customers WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error logging in: ' + err.message });
        }

        if (results.length > 0) {
            // Update last login time in UTC
            const updateQuery = 'UPDATE customers SET last_login = NOW() WHERE username = ?';
            db.query(updateQuery, [username], (err) => {
                if (err) console.error('Error updating last login:', err);
            });
            return res.json({ success: true });
        } else {
            return res.json({ success: false, message: 'Invalid username or password' });
        }
    });
});


//for admin page 
app.get('/get-customers', (req, res) => {
    const query = 'SELECT username, last_login FROM customers';
    db.query(query, (err, results) => {
        if (err) return res.status(500).send('Error fetching customers: ' + err.message);
        res.json(results);
    });
});

app.delete('/delete-customer/:username', (req, res) => {
    const username = req.params.username;

    const query = 'DELETE FROM customers WHERE username = ?';
    db.query(query, [username], (err) => {
        if (err) {
            console.error('Error deleting customer:', err);
            return res.status(500).json({ success: false, message: 'Error deleting customer: ' + err.message });
        }
        res.json({ success: true });
    });
});

// ==================== Server Start ====================
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});