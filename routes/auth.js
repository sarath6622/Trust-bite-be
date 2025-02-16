const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const dotenv = require('dotenv');

dotenv.config();

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body; // ✅ Extract `name`

    // Basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Missing required fields: name, email, password, or role' });
    }

    console.log('🔹 Request body:', req.body);  // ✅ Debugging log

    // Check if the email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({ name, email, password: hashedPassword, role }); // ✅ Include `name`
    await user.save();

    console.log("✅ User successfully registered:", user); // ✅ Debugging log
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('❌ Error registering user:', error);
    res.status(400).json({ message: 'Error registering user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide both email and password' });
    }

    console.log('Received login request with email:', email); // Log the received email

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Authentication failed. No user found with this email' });
    }

    console.log('User found:', user);  // Log the found user

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);  // Log password comparison result

    if (!isMatch) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role, name: user.name }, 
      process.env.JWT_SECRET, 
      { expiresIn: "1h" }
    );

    console.log('JWT Token generated:', token); // Log the generated token
    res.json({ token });
  } catch (error) {
    console.error('Error during login:', error);  // Log the full error
    res.status(400).json({ message: 'Error logging in' });
  }
});

const redisClient = require("../config/redis"); // Initialize Redis

router.post("/logout", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      console.log("❌ Logout attempt failed: No token provided.");
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Store token in Redis with expiration time matching the JWT expiry
    await redisClient.set(token, "blacklisted", "EX", decoded.exp - Math.floor(Date.now() / 1000));

    console.log(`🚪 User Logged Out: ${decoded.id} (Role: ${decoded.role})`);
    res.json({ message: "Logout successful" });
  } catch (error) {
    console.error("❌ Error in logout:", error.message);
    res.status(500).json({ message: "Server error during logout" });
  }
});

module.exports = router;