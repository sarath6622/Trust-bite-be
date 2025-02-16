const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const app = express();
const server = http.createServer(app); // Attach HTTP server properly
const io = new Server(server, {
    cors: {
        origin: "*", // Allow frontend to connect
        methods: ["GET", "POST"]
    }
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Pass io to restaurant routes
const restaurantRoutes = require('./routes/restaurants')(io);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/auth', authRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use(adminRoutes);

io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
  
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  
    // Example test event
    socket.on("message", (data) => {
      console.log("Message received:", data);
      io.emit("message", `Echo: ${data}`);
    });
  });

// Start the server
const PORT = process.env.PORT || 5003;
server.listen(PORT, () => { // Use server.listen instead of app.listen
    console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };