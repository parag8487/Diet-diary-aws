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

//Chatbot 
app.post('/chat', async (req, res) => {
    const { message } = req.body;

    if (!message?.trim()) {
        return res.status(400).json({ reply: "Message cannot be empty." });
    }

    // Custom handling for highest protein/calories/carbs queries
    const lowerMsg = message.toLowerCase();
    const nutrientMap = {
        'protein': { key: 'protein', label: 'Protein (g)' },
        'calories': { key: 'calories', label: 'Calories' },
        'carbs': { key: 'carbs', label: 'Carbs (g)' }
    };
    let nutrient = null;
    if (lowerMsg.includes('highest protein')) nutrient = 'protein';
    else if (lowerMsg.includes('highest calorie') || lowerMsg.includes('highest calories')) nutrient = 'calories';
    else if (lowerMsg.includes('highest carb') || lowerMsg.includes('highest carbs')) nutrient = 'carbs';

    // 1. Highest protein/calories/carbs foods (already handled)
    if (nutrient) {
        try {
            const data = await fs.readFile(dataPath);
            const foods = JSON.parse(data);
            // Sort foods by the requested nutrient (descending)
            const sorted = foods
                .filter(f => f[nutrientMap[nutrient].key] && !isNaN(parseFloat(f[nutrientMap[nutrient].key])))
                .sort((a, b) => parseFloat(b[nutrientMap[nutrient].key]) - parseFloat(a[nutrientMap[nutrient].key]));
            const topFoods = sorted.slice(0, 5);
            const lines = topFoods.map(f => `${f.title} : ${f[nutrientMap[nutrient].key]}`);
            const reply = `Top 5 foods with the highest ${nutrientMap[nutrient].label}:\n` + lines.join('\n');
            return res.json({ reply });
        } catch (err) {
            return res.status(500).json({ reply: 'Error reading food data.' });
        }
    }

    // 2. Which is highest protein in all the food listed
    if (lowerMsg.includes('which is highest protein')) {
        try {
            const data = await fs.readFile(dataPath);
            const foods = JSON.parse(data);
            const sorted = foods
                .filter(f => f.protein && !isNaN(parseFloat(f.protein)))
                .sort((a, b) => parseFloat(b.protein) - parseFloat(a.protein));
            const top = sorted[0];
            if (top) {
                const reply = `Food with the highest protein:\nFood : Protein (g)\n${top.title} : ${top.protein}`;
                return res.json({ reply });
            } else {
                return res.json({ reply: 'No food data available.' });
            }
        } catch (err) {
            return res.status(500).json({ reply: 'Error reading food data.' });
        }
    }

    // Highest calorie food
    if (lowerMsg.includes('which is highest calorie') || lowerMsg.includes('which is highest calories')) {
        try {
            const data = await fs.readFile(dataPath);
            const foods = JSON.parse(data);
            const sorted = foods
                .filter(f => f.calories && !isNaN(parseFloat(f.calories)))
                .sort((a, b) => parseFloat(b.calories) - parseFloat(a.calories));
            const top = sorted[0];
            if (top) {
                const reply = `Food with the highest calories:\nFood : Calories\n${top.title} : ${top.calories}`;
                return res.json({ reply });
            } else {
                return res.json({ reply: 'No food data available.' });
            }
        } catch (err) {
            return res.status(500).json({ reply: 'Error reading food data.' });
        }
    }

    // Highest carb food
    if (lowerMsg.includes('which is highest carb')) {
        try {
            const data = await fs.readFile(dataPath);
            const foods = JSON.parse(data);
            const sorted = foods
                .filter(f => f.carbs && !isNaN(parseFloat(f.carbs)))
                .sort((a, b) => parseFloat(b.carbs) - parseFloat(a.carbs));
            const top = sorted[0];
            if (top) {
                const reply = `Food with the highest carbs:\nFood : Carbs (g)\n${top.title} : ${top.carbs}`;
                return res.json({ reply });
            } else {
                return res.json({ reply: 'No food data available.' });
            }
        } catch (err) {
            return res.status(500).json({ reply: 'Error reading food data.' });
        }
    }

    // Highest fat food
    if (lowerMsg.includes('which is highest fat')) {
        try {
            const data = await fs.readFile(dataPath);
            const foods = JSON.parse(data);
            const sorted = foods
                .filter(f => f.fat && !isNaN(parseFloat(f.fat)))
                .sort((a, b) => parseFloat(b.fat) - parseFloat(a.fat));
            const top = sorted[0];
            if (top) {
                const reply = `Food with the highest fat:\nFood : Fat (g)\n${top.title} : ${top.fat}`;
                return res.json({ reply });
            } else {
                return res.json({ reply: 'No food data available.' });
            }
        } catch (err) {
            return res.status(500).json({ reply: 'Error reading food data.' });
        }
    }

    // 3. Create me a high protein meal
    if (lowerMsg.includes('high protein meal')) {
        try {
            const data = await fs.readFile(dataPath);
            const foods = JSON.parse(data);
            const sorted = foods
                .filter(f => f.protein && !isNaN(parseFloat(f.protein)))
                .sort((a, b) => parseFloat(b.protein) - parseFloat(a.protein));
            const mealFoods = sorted.slice(0, 3);
            if (mealFoods.length > 0) {
                let reply = 'High protein meal suggestion (top 3 foods):\nFood : Protein (g)\n';
                reply += mealFoods.map(f => `${f.title} : ${f.protein}`).join('\n');
                return res.json({ reply });
            } else {
                return res.json({ reply: 'No food data available.' });
            }
        } catch (err) {
            return res.status(500).json({ reply: 'Error reading food data.' });
        }
    }

    // Create me a high calorie meal
    if (lowerMsg.includes('high calorie meal')) {
        try {
            const data = await fs.readFile(dataPath);
            const foods = JSON.parse(data);
            const sorted = foods
                .filter(f => f.calories && !isNaN(parseFloat(f.calories)))
                .sort((a, b) => parseFloat(b.calories) - parseFloat(a.calories));
            const mealFoods = sorted.slice(0, 3);
            if (mealFoods.length > 0) {
                let reply = 'High calorie meal suggestion (top 3 foods):\nFood : Calories\n';
                reply += mealFoods.map(f => `${f.title} : ${f.calories}`).join('\n');
                return res.json({ reply });
            } else {
                return res.json({ reply: 'No food data available.' });
            }
        } catch (err) {
            return res.status(500).json({ reply: 'Error reading food data.' });
        }
    }

   
    // Create me a high fat meal
    if (lowerMsg.includes('high fat meal')) {
        try {
            const data = await fs.readFile(dataPath);
            const foods = JSON.parse(data);
            const sorted = foods
                .filter(f => f.fat && !isNaN(parseFloat(f.fat)))
                .sort((a, b) => parseFloat(b.fat) - parseFloat(a.fat));
            const mealFoods = sorted.slice(0, 3);
            if (mealFoods.length > 0) {
                let reply = 'High fat meal suggestion (top 3 foods):\nFood : Fat (g)\n';
                reply += mealFoods.map(f => `${f.title} : ${f.fat}`).join('\n');
                return res.json({ reply });
            } else {
                return res.json({ reply: 'No food data available.' });
            }
        } catch (err) {
            return res.status(500).json({ reply: 'Error reading food data.' });
        }
    }

    // Nutrition for a specific food (flexible matching)
    const nutritionMatch = lowerMsg.match(/nutrition (?:in|of|for) ([a-zA-Z0-9 \-]+)/);
    if (nutritionMatch) {
        const foodQuery = nutritionMatch[1].trim().toLowerCase();
        try {
            const data = await fs.readFile(dataPath);
            const foods = JSON.parse(data);
            // Flexible matching: case-insensitive, partial match
            const matches = foods.filter(f => f.title && f.title.trim().toLowerCase().includes(foodQuery));
            if (matches.length === 1) {
                const food = matches[0];
                const reply = `Nutrition for ${food.title}:\n| Calories | Protein (g) | Carbs (g) | Fat (g) |\n|----------|-------------|-----------|---------|\n| ${food.calories} | ${food.protein} | ${food.carbs} | ${food.fat} |`;
                return res.json({ reply });
            } else if (matches.length > 1) {
                let reply = `Multiple foods found for '${foodQuery}':\n| Food | Calories | Protein (g) | Carbs (g) | Fat (g) |\n|------|----------|-------------|-----------|---------|\n`;
                reply += matches.map(f => `| ${f.title} | ${f.calories} | ${f.protein} | ${f.carbs} | ${f.fat} |`).join('\n');
                return res.json({ reply });
            } else {
                return res.json({ reply: 'Food not found.' });
            }
        } catch (err) {
            return res.status(500).json({ reply: 'Error reading food data.' });
        }
    }

    // Nutrient-based food search (e.g., 'show foods with more than 20g protein')
    const nutrientSearchMatch = lowerMsg.match(/(?:show|list) foods with (more|less) than (\d+(?:\.\d+)?) ?(protein|calories|carbs|fat)/);
    if (nutrientSearchMatch) {
        const moreOrLess = nutrientSearchMatch[1];
        const value = parseFloat(nutrientSearchMatch[2]);
        const nutrient = nutrientSearchMatch[3];
        const nutrientKey = nutrient === 'calories' ? 'calories' : nutrient === 'protein' ? 'protein' : nutrient === 'carbs' ? 'carbs' : 'fat';
        try {
            const data = await fs.readFile(dataPath);
            const foods = JSON.parse(data);
            const filtered = foods.filter(f => f[nutrientKey] && !isNaN(parseFloat(f[nutrientKey])) && (moreOrLess === 'more' ? parseFloat(f[nutrientKey]) > value : parseFloat(f[nutrientKey]) < value));
            if (filtered.length > 0) {
                let reply = `Foods with ${moreOrLess} than ${value} ${nutrient}:\n| Food | ${nutrient.charAt(0).toUpperCase() + nutrient.slice(1)} |\n|------|------|\n`;
                reply += filtered.map(f => `| ${f.title} | ${f[nutrientKey]} |`).join('\n');
                return res.json({ reply });
            } else {
                return res.json({ reply: 'No foods found.' });
            }
        } catch (err) {
            return res.status(500).json({ reply: 'Error reading food data.' });
        }
    }

    // Custom meal builder (e.g., 'suggest a meal with at least 50g protein and under 700 calories')
    const mealBuilderMatch = lowerMsg.match(/suggest a meal with (at least|under|less than|more than|over) (\d+(?:\.\d+)?) ?(protein|calories|carbs|fat)(?: (and|&) (at least|under|less than|more than|over) (\d+(?:\.\d+)?) ?(protein|calories|carbs|fat))?/);
    if (mealBuilderMatch) {
        // Parse first constraint
        const op1 = mealBuilderMatch[1];
        const val1 = parseFloat(mealBuilderMatch[2]);
        const nut1 = mealBuilderMatch[3];
        // Parse optional second constraint
        const op2 = mealBuilderMatch[5];
        const val2 = mealBuilderMatch[6] ? parseFloat(mealBuilderMatch[6]) : null;
        const nut2 = mealBuilderMatch[7];
        // Helper to check constraint
        function check(food, op, val, nut) {
            const v = parseFloat(food[nut]);
            if (isNaN(v)) return false;
            if (op === 'at least' || op === 'more than' || op === 'over') return v >= val;
            if (op === 'under' || op === 'less than') return v <= val;
            return false;
        }
        try {
            const data = await fs.readFile(dataPath);
            const foods = JSON.parse(data);
            // Try all combinations of up to 3 foods
            let found = null;
            outer: for (let i = 0; i < foods.length; i++) {
                for (let j = i; j < foods.length; j++) {
                    for (let k = j; k < foods.length; k++) {
                        const combo = [foods[i]];
                        if (j !== i) combo.push(foods[j]);
                        if (k !== j && k !== i) combo.push(foods[k]);
                        const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
                        combo.forEach(f => {
                            totals.calories += parseFloat(f.calories) || 0;
                            totals.protein += parseFloat(f.protein) || 0;
                            totals.carbs += parseFloat(f.carbs) || 0;
                            totals.fat += parseFloat(f.fat) || 0;
                        });
                        const nut1key = nut1 === 'calories' ? 'calories' : nut1 === 'protein' ? 'protein' : nut1 === 'carbs' ? 'carbs' : 'fat';
                        const nut2key = nut2 === 'calories' ? 'calories' : nut2 === 'protein' ? 'protein' : nut2 === 'carbs' ? 'carbs' : 'fat';
                        if (check(totals, op1, val1, nut1key) && (!op2 || check(totals, op2, val2, nut2key))) {
                            found = { combo, totals };
                            break outer;
                        }
                    }
                }
            }
            if (found) {
                let reply = 'Meal suggestion:\n| Food | Calories | Protein (g) | Carbs (g) | Fat (g) |\n|------|----------|-------------|-----------|---------|\n';
                reply += found.combo.map(f => `| ${f.title} | ${f.calories} | ${f.protein} | ${f.carbs} | ${f.fat} |`).join('\n');
                reply += `\n| **Total** | **${found.totals.calories}** | **${found.totals.protein}** | **${found.totals.carbs}** | **${found.totals.fat}** |`;
                return res.json({ reply });
            } else {
                return res.json({ reply: 'No suitable meal found.' });
            }
        } catch (err) {
            return res.status(500).json({ reply: 'Error reading food data.' });
        }
    }

    // Food comparison (e.g., 'compare X and Y')
    const compareMatch = lowerMsg.match(/compare ([a-zA-Z0-9 \-]+) and ([a-zA-Z0-9 \-]+)/);
    if (compareMatch) {
        const food1 = compareMatch[1].trim().toLowerCase();
        const food2 = compareMatch[2].trim().toLowerCase();
        try {
            const data = await fs.readFile(dataPath);
            const foods = JSON.parse(data);
            const f1 = foods.find(f => f.title && f.title.trim().toLowerCase().includes(food1));
            const f2 = foods.find(f => f.title && f.title.trim().toLowerCase().includes(food2));
            if (f1 && f2) {
                let reply = 'Nutrition Comparison:\n| Food | Calories | Protein (g) | Carbs (g) | Fat (g) |\n|------|----------|-------------|-----------|---------|\n';
                reply += `| ${f1.title} | ${f1.calories} | ${f1.protein} | ${f1.carbs} | ${f1.fat} |\n`;
                reply += `| ${f2.title} | ${f2.calories} | ${f2.protein} | ${f2.carbs} | ${f2.fat} |`;
                return res.json({ reply });
            } else {
                return res.json({ reply: 'One or both foods not found.' });
            }
        } catch (err) {
            return res.status(500).json({ reply: 'Error reading food data.' });
        }
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
