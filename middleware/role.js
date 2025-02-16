const jwt = require('jsonwebtoken');

const verifyRole = (roles) => (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify JWT
    req.user = decoded;

    // Check if user's role is in the allowed roles
    if (!roles.includes(decoded.role)) {
      return res.status(403).json({ message: `Access denied. Required role: ${roles.join(' or ')}.` });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token. Please login again.' });
  }
};

module.exports = verifyRole;