const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Extract Bearer Token
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify JWT
    req.user = decoded; // Attach decoded user info to request object
    next(); // Proceed to the next middleware
  } catch (error) {
    res.status(401).json({ message: 'Invalid token. Please login again.' });
  }
};

module.exports = authMiddleware;