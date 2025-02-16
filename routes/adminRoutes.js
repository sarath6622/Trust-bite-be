const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Assuming you have a User model
const Restaurant = require('../models/Restaurant'); // Assuming you have a Restaurant model

// Get count of Food Safety Officers
router.get('/api/admin/safety-officers/count', async (req, res) => {
    try {
        const count = await User.countDocuments({ role: 'FoodSafetyOfficeUser' });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// Get count of Customers
router.get('/api/admin/customer/count', async (req, res) => {
    try {
        const count = await User.countDocuments({ role: 'Customer' });
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// Get count of Restaurants
router.get('/api/admin/restaurants/count', async (req, res) => {
    try {
        const count = await Restaurant.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

// Get count of All Users
router.get('/api/admin/users/count', async (req, res) => {
    try {
        const count = await User.countDocuments();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;