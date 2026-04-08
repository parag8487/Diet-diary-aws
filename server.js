require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./src/routes/api.routes');
const secretsService = require('./src/services/secrets.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Server
async function startServer() {
    // Load secrets from AWS Secrets Manager if in production
    await secretsService.loadSecrets();

    app.use(cors());
    app.use(express.json());
    app.use(bodyParser.json());

    // Serve static files from the public folder
    app.use(express.static(path.join(__dirname, 'public')));

    // API Routes
    app.use('/api', apiRoutes);

    // Legacy fallback routes (optional, keeping for compatibility)
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.get('/health', (req, res) => {
        res.status(200).send('Project Reorganized & Cloud-Ready');
    });

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Frontend served from: ${path.join(__dirname, 'public')}`);
    });
}

startServer().catch(err => {
    console.error('Failed to start server:', err);
});
