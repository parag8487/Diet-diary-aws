require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios'); 

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

//  MySQL Configuration 
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});

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
            username VARCHAR(255) NOT NULL,
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
        )`,
        `CREATE TABLE IF NOT EXISTS customers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            last_login DATETIME
        )`
    ];

    queries.forEach(query => {
        db.query(query, (err) => {
            if (err) console.error(`Error creating table with query: ${query}\nError:`, err);
        });
    });
};

// To Make sure the data folder exists before using it
const ensureDataFolder = async () => {
    const folderPath = path.join(__dirname, 'data');
    try {
        await fs.mkdir(folderPath, { recursive: true });
    } catch (error) {
        console.error('Failed to create data folder:', error.message);
    }
};

// Create foods.json if it doesn't exist
const initializeJSON = async () => {
    try {
        await fs.access(dataPath);
    } catch (error) {
        await fs.writeFile(dataPath, JSON.stringify([]));
        console.log('Created foods.json file');
    }
};


ensureDataFolder().then(() => {
    initializeJSON();
});


const dataPath = path.join(__dirname, 'data', 'foods.json');


app.use(express.static(path.join(__dirname)));


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// API Endpoints 

// ------ Meals & Foods ------
app.post('/save-data', (req, res) => {
    const { username, day, data } = req.body;
    if (!username || !day) return res.status(400).send('Username and day are required');
    const checkQuery = 'SELECT * FROM meals WHERE username = ? AND day = ?';

    db.query(checkQuery, [username, day], (err, results) => {
        if (err) return res.status(500).send('Error checking data: ' + err.message);

        const query = results.length > 0
            ? 'UPDATE meals SET data = ? WHERE username = ? AND day = ?'
            : 'INSERT INTO meals (data, username, day) VALUES (?, ?, ?)';
        const params = results.length > 0
            ? [JSON.stringify(data), username, day]
            : [JSON.stringify(data), username, day];

        db.query(query, params, (err) => {
            if (err) return res.status(500).send('Error saving data: ' + err.message);
            res.send(results.length > 0 ? 'Data updated' : 'Data inserted');
        });
    });
});

// Add a new food item
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

// Delete all meal data
app.delete('/delete-data', (req, res) => {
    db.query('DELETE FROM meals', (err) => {
        if (err) return res.status(500).send('Error deleting data: ' + err.message);
        res.send('All meal data deleted from MySQL');
    });
});

app.get('/get-weekly-data', (req, res) => {
    const username = req.query.username;
    if (!username) return res.status(400).send('Username is required');
    const query = `SELECT day, data FROM meals WHERE username = ?
                   ORDER BY FIELD(day, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
                   'Friday', 'Saturday', 'Sunday')`;

    db.query(query, [username], (err, results) => {
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

// Get all foods from JSON file
app.get('/api/foods', async (req, res) => {
    try {
        console.log('Attempting to read food data from:', dataPath);
        const data = await fs.readFile(dataPath);
        console.log('Successfully read food data, length:', data.length);
        const parsedData = JSON.parse(data);
        console.log('Successfully parsed JSON, items count:', parsedData.length);
        res.json(parsedData);
    } catch (error) {
        console.error('Error in /api/foods:', error);
        res.status(500).json({ error: 'Error reading food data: ' + error.message });
    }
});

// Add a new food to JSON file
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

// Register a new user
app.post('/signup', (req, res) => {
    const { username, password } = req.body;

    const query = 'INSERT INTO customers (username, password) VALUES (?, ?)';
    db.query(query, [username, password], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') {
                return res.json({ success: false, message: 'Username already exists.' });
            }
            return res.status(500).json({ success: false, message: 'Error registering: ' + err.message });
        }
        res.json({ success: true });
    });
});

// User login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    const query = 'SELECT * FROM customers WHERE username = ? AND password = ?';
    db.query(query, [username, password], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error logging in: ' + err.message });
        }

        if (results.length > 0) {
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

// ------ Admin ------
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
            return res.status(500).json({ success: false, message: 'Error deleting customer: ' + err.message });
        }
        res.json({ success: true });
    });
});

//Chatbot 
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    if (!message?.trim()) {
        return res.status(400).json({ reply: "Message cannot be empty." });
    }

    try {

        const isNutritionRequest = message.toLowerCase().includes('calories') && 
                                 message.toLowerCase().includes('grams');
        
        
        let promptContext = '';
        
        if (isNutritionRequest) {
            promptContext = `
            You are a nutrition assistant that provides clear, concise answers about food nutrition.
            
            For nutrition questions:
            1. Only provide the calories, carbohydrates, fats, and protein content.
            2. Format your answer in a simple way without disclaimers or extra information.
            3. Use this format: "100 grams of [food name] contains: Calories: X kcal, Carbohydrates: X grams, Fat: X grams, Protein: X grams."
            4. If an image URL is requested, provide a direct link to a relevant image.
            
            Important: Do not include disclaimers, cooking methods, or any extra information beyond the nutrition facts.
            `;
        } else {
            promptContext = `
            You are a helpful nutrition and diet assistant. Provide concise, accurate answers.
            Keep responses under 3 sentences unless detailed information is specifically requested.
            `;
        }
        
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`,
            {
                contents: [
                    {
                        role: "user",
                        parts: [{ text: promptContext + "\n\nUser question: " + message }]
                    }
                ]
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "No reply from Gemini";
        res.json({ reply });
    } catch (error) {
        console.error("Gemini API Error:", error?.response?.data || error.message);
        res.status(500).json({ reply: 'Error communicating with Gemini API' });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
