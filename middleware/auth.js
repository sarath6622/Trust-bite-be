const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access denied. No token provided." });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request object

    next(); // Proceed to the next middleware
  } catch (error) {
    console.error("🔴 Authentication error:", error.message);
    return res.status(403).json({ message: "Invalid or expired token. Please login again." });
  }
};

module.exports = authMiddleware;