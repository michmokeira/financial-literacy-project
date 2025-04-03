const User = require('../models/user');

const authorizeAdmin = async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admins only' });
  }
  next();
};

module.exports = authorizeAdmin;
