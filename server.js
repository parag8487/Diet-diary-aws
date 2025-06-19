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
    const username = req.query.username;
    if (!username) return res.status(400).send('Username is required');
    db.query('DELETE FROM meals WHERE username = ?', [username], (err) => {
        if (err) return res.status(500).send('Error deleting data: ' + err.message);
        res.send('All meal data deleted for user: ' + username);
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

//Chatbot - Updated to work exclusively with foods.json data
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    if (!message?.trim()) {
        return res.status(400).json({ reply: "Message cannot be empty." });
    }

    const lowerMsg = message.toLowerCase();

    try {
        // Read foods.json data
        const data = await fs.readFile(dataPath);
        const foods = JSON.parse(data);

        if (foods.length === 0) {
            return res.json({ reply: 'No food data available in the database.' });
        }

        // Helper function to create table format
        const createTable = (headers, rows) => {
            const headerRow = `| ${headers.join(' | ')} |`;
            const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`;
            const dataRows = rows.map(row => `| ${row.join(' | ')} |`).join('\n');
            return `${headerRow}\n${separatorRow}\n${dataRows}`;
        };

        // 1. Highest protein foods
        if (lowerMsg.includes('highest protein')) {
            const sorted = foods
                .filter(f => f.protein && !isNaN(parseFloat(f.protein)))
                .sort((a, b) => parseFloat(b.protein) - parseFloat(a.protein))
                .slice(0, 5);
            
            const headers = ['Food', 'Protein (g)'];
            const rows = sorted.map(f => [f.title, f.protein]);
            const table = createTable(headers, rows);
            return res.json({ reply: `**Top 5 High Protein Foods:**\n${table}` });
        }

        // 2. Highest calorie foods
        if (lowerMsg.includes('highest calorie') || lowerMsg.includes('highest calories')) {
            const sorted = foods
                .filter(f => f.calories && !isNaN(parseFloat(f.calories)))
                .sort((a, b) => parseFloat(b.calories) - parseFloat(a.calories))
                .slice(0, 5);
            
            const headers = ['Food', 'Calories'];
            const rows = sorted.map(f => [f.title, f.calories]);
            const table = createTable(headers, rows);
            return res.json({ reply: `**Top 5 High Calorie Foods:**\n${table}` });
        }

        // 3. Highest carb foods
        if (lowerMsg.includes('highest carb')) {
            const sorted = foods
                .filter(f => f.carbs && !isNaN(parseFloat(f.carbs)))
                .sort((a, b) => parseFloat(b.carbs) - parseFloat(a.carbs))
                .slice(0, 5);
            
            const headers = ['Food', 'Carbs (g)'];
            const rows = sorted.map(f => [f.title, f.carbs]);
            const table = createTable(headers, rows);
            return res.json({ reply: `**Top 5 High Carb Foods:**\n${table}` });
        }

        // 4. Highest fat foods
        if (lowerMsg.includes('highest fat')) {
            const sorted = foods
                .filter(f => f.fat && !isNaN(parseFloat(f.fat)))
                .sort((a, b) => parseFloat(b.fat) - parseFloat(a.fat))
                .slice(0, 5);
            
            const headers = ['Food', 'Fat (g)'];
            const rows = sorted.map(f => [f.title, f.fat]);
            const table = createTable(headers, rows);
            return res.json({ reply: `**Top 5 High Fat Foods:**\n${table}` });
        }

        // 5. High protein meal suggestion (3 foods)
        if (lowerMsg.includes('high protein meal')) {
            const sorted = foods
                .filter(f => f.protein && !isNaN(parseFloat(f.protein)))
                .sort((a, b) => parseFloat(b.protein) - parseFloat(a.protein))
                .slice(0, 3);
            
            if (sorted.length === 0) {
                return res.json({ reply: 'No protein data available in our database.' });
            }
            
            const headers = ['Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
            const rows = sorted.map(f => [f.title, f.calories, f.protein, f.carbs, f.fat]);
            const table = createTable(headers, rows);
            
            const totals = sorted.reduce((acc, f) => ({
                calories: acc.calories + (parseFloat(f.calories) || 0),
                protein: acc.protein + (parseFloat(f.protein) || 0),
                carbs: acc.carbs + (parseFloat(f.carbs) || 0),
                fat: acc.fat + (parseFloat(f.fat) || 0)
            }), {calories: 0, protein: 0, carbs: 0, fat: 0});
            
            const totalRow = `| **Total** | **${totals.calories.toFixed(1)}** | **${totals.protein.toFixed(1)}** | **${totals.carbs.toFixed(1)}** | **${totals.fat.toFixed(1)}** |`;
            
            return res.json({ reply: `**High Protein Meal (3 Foods):**\n${table}\n${totalRow}` });
        }

        // 6. High calorie meal suggestion (3 foods)
        if (lowerMsg.includes('high calorie meal')) {
            const sorted = foods
                .filter(f => f.calories && !isNaN(parseFloat(f.calories)))
                .sort((a, b) => parseFloat(b.calories) - parseFloat(a.calories))
                .slice(0, 3);
            
            if (sorted.length === 0) {
                return res.json({ reply: 'No calorie data available in our database.' });
            }
            
            const headers = ['Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
            const rows = sorted.map(f => [f.title, f.calories, f.protein, f.carbs, f.fat]);
            const table = createTable(headers, rows);
            
            const totals = sorted.reduce((acc, f) => ({
                calories: acc.calories + (parseFloat(f.calories) || 0),
                protein: acc.protein + (parseFloat(f.protein) || 0),
                carbs: acc.carbs + (parseFloat(f.carbs) || 0),
                fat: acc.fat + (parseFloat(f.fat) || 0)
            }), {calories: 0, protein: 0, carbs: 0, fat: 0});
            
            const totalRow = `| **Total** | **${totals.calories.toFixed(1)}** | **${totals.protein.toFixed(1)}** | **${totals.carbs.toFixed(1)}** | **${totals.fat.toFixed(1)}** |`;
            
            return res.json({ reply: `**High Calorie Meal (3 Foods):**\n${table}\n${totalRow}` });
        }

        // 7. High fat meal suggestion (3 foods)
        if (lowerMsg.includes('high fat meal')) {
            const sorted = foods
                .filter(f => f.fat && !isNaN(parseFloat(f.fat)))
                .sort((a, b) => parseFloat(b.fat) - parseFloat(a.fat))
                .slice(0, 3);
            
            if (sorted.length === 0) {
                return res.json({ reply: 'No fat data available in our database.' });
            }
            
            const headers = ['Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
            const rows = sorted.map(f => [f.title, f.calories, f.protein, f.carbs, f.fat]);
            const table = createTable(headers, rows);
            
            const totals = sorted.reduce((acc, f) => ({
                calories: acc.calories + (parseFloat(f.calories) || 0),
                protein: acc.protein + (parseFloat(f.protein) || 0),
                carbs: acc.carbs + (parseFloat(f.carbs) || 0),
                fat: acc.fat + (parseFloat(f.fat) || 0)
            }), {calories: 0, protein: 0, carbs: 0, fat: 0});
            
            const totalRow = `| **Total** | **${totals.calories.toFixed(1)}** | **${totals.protein.toFixed(1)}** | **${totals.carbs.toFixed(1)}** | **${totals.fat.toFixed(1)}** |`;
            
            return res.json({ reply: `**High Fat Meal (3 Foods):**\n${table}\n${totalRow}` });
        }

        // 8. Nutrition information for specific food
        const nutritionMatch = lowerMsg.match(/nutrition (?:of|for|in) (.+)/);
        if (nutritionMatch) {
            const foodQuery = nutritionMatch[1].trim().toLowerCase();
            const matches = foods.filter(f => f.title && f.title.toLowerCase().includes(foodQuery));
            
            if (matches.length === 0) {
                return res.json({ reply: `No food found matching "${foodQuery}" in our database.` });
            }
            
            const headers = ['Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
            const rows = matches.map(f => [f.title, f.calories, f.protein, f.carbs, f.fat]);
            const table = createTable(headers, rows);
            
            return res.json({ reply: `**Nutrition Information:**\n${table}` });
        }

        // 9. Compare two foods
        const compareMatch = lowerMsg.match(/compare (.+) (?:and|with) (.+)/);
        if (compareMatch) {
            const food1Query = compareMatch[1].trim().toLowerCase();
            const food2Query = compareMatch[2].trim().toLowerCase();
            
            const food1 = foods.find(f => f.title && f.title.toLowerCase().includes(food1Query));
            const food2 = foods.find(f => f.title && f.title.toLowerCase().includes(food2Query));
            
            if (!food1 || !food2) {
                return res.json({ reply: 'One or both foods not found in our database.' });
            }
            
            const headers = ['Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
            const rows = [
                [food1.title, food1.calories, food1.protein, food1.carbs, food1.fat],
                [food2.title, food2.calories, food2.protein, food2.carbs, food2.fat]
            ];
            const table = createTable(headers, rows);
            
            return res.json({ reply: `**Food Comparison:**\n${table}` });
        }

        // 10. List all foods
        if (lowerMsg.includes('list all foods') || lowerMsg.includes('show all foods')) {
            const headers = ['Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
            const rows = foods.map(f => [f.title, f.calories, f.protein, f.carbs, f.fat]);
            const table = createTable(headers, rows);
            
            return res.json({ reply: `**All Foods in Database:**\n${table}` });
        }

        // 11. Random meal suggestion (3 foods)
        if (lowerMsg.includes('suggest meal') || lowerMsg.includes('create meal') || lowerMsg.includes('random meal')) {
            const shuffled = [...foods].sort(() => 0.5 - Math.random());
            const mealFoods = shuffled.slice(0, 3);
            
            if (mealFoods.length === 0) {
                return res.json({ reply: 'No food data available in our database.' });
            }
            
            const headers = ['Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
            const rows = mealFoods.map(f => [f.title, f.calories, f.protein, f.carbs, f.fat]);
            const table = createTable(headers, rows);
            
            const totals = mealFoods.reduce((acc, f) => ({
                calories: acc.calories + (parseFloat(f.calories) || 0),
                protein: acc.protein + (parseFloat(f.protein) || 0),
                carbs: acc.carbs + (parseFloat(f.carbs) || 0),
                fat: acc.fat + (parseFloat(f.fat) || 0)
            }), {calories: 0, protein: 0, carbs: 0, fat: 0});
            
            const totalRow = `| **Total** | **${totals.calories.toFixed(1)}** | **${totals.protein.toFixed(1)}** | **${totals.carbs.toFixed(1)}** | **${totals.fat.toFixed(1)}** |`;
            
            return res.json({ reply: `**Random Meal Suggestion (3 Foods):**\n${table}\n${totalRow}` });
        }

        // 12. Foods with specific nutrient criteria
        const nutrientMatch = lowerMsg.match(/foods with (more|less) than (\d+) ?(calories|protein|carbs|fat)/);
        if (nutrientMatch) {
            const comparison = nutrientMatch[1]; // 'more' or 'less'
            const value = parseInt(nutrientMatch[2]);
            const nutrient = nutrientMatch[3];
            
            const filtered = foods.filter(f => {
                const nutrientValue = parseFloat(f[nutrient]);
                if (isNaN(nutrientValue)) return false;
                return comparison === 'more' ? nutrientValue > value : nutrientValue < value;
            });
            
            if (filtered.length === 0) {
                return res.json({ reply: `No foods found with ${comparison} than ${value} ${nutrient} in our database.` });
            }
            
            const headers = ['Food', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
            const rows = filtered.map(f => [f.title, f.calories, f.protein, f.carbs, f.fat]);
            const table = createTable(headers, rows);
            
            return res.json({ reply: `**Foods with ${comparison} than ${value} ${nutrient}:**\n${table}` });
        }

        // 13. Help message
        if (lowerMsg.includes('help') || lowerMsg === 'what can you do') {
            const helpMessage = `**I can help you with food nutrition from our database:**

**Available Commands:**
• "highest protein" - Show top 5 high protein foods
• "highest calories" - Show top 5 high calorie foods
• "highest carbs" - Show top 5 high carb foods
• "highest fat" - Show top 5 high fat foods
• "high protein meal" - Suggest a high protein meal
• "high calorie meal" - Suggest a high calorie meal
• "high fat meal" - Suggest a high fat meal
• "nutrition of [food name]" - Get nutrition info for specific food
• "compare [food1] and [food2]" - Compare two foods
• "list all foods" - Show all foods in database
• "suggest meal" - Get a random meal suggestion
• "foods with more than X calories/protein/carbs/fat" - Filter foods by criteria

All responses are based on foods in our database only.`;
            
            return res.json({ reply: helpMessage });
        }

        // Default response for unrecognized queries
        return res.json({ 
            reply: `I can only provide information about foods in our database. Type "help" to see available commands, or try asking about nutrition, meal suggestions, or food comparisons.` 
        });

    } catch (error) {
        console.error('Error reading food data:', error);
        return res.status(500).json({ reply: 'Error accessing food database.' });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
