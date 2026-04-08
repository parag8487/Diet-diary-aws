const express = require('express');
const router = express.Router();
const foodController = require('../controllers/food.controller');
const userController = require('../controllers/user.controller');
const chatController = require('../controllers/chat.controller');

// Food & Meals
router.get('/foods', foodController.getAllFoods);
router.post('/save-data', foodController.saveMealData);
router.post('/save-food', foodController.saveFoodItem);
router.get('/get-weekly-data', foodController.getWeeklyData);
router.delete('/delete-data', foodController.deleteData);
router.get('/get-food/:day', foodController.getFoodByDay);

// Users & Auth
router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.get('/get-customers', userController.getCustomers);
router.delete('/delete-customer/:username', userController.deleteCustomer);

// AI Chat & Image Analysis
router.post('/chat', chatController.handleChat);
router.post('/analyze-food', chatController.analyzeFoodImage);
router.post('/admin-chat', chatController.handleAdminChat);

module.exports = router;
