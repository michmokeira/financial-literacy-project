const User = require('../models/user');
const express = require('express');
const router = express.Router();

// Middleware to protect routes
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

// Dashboard route
router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id)
            .populate('enrolledCourses')
            .populate('badges')
            .populate('forumPosts');
            res.render('dashboard', {
                title: user.role === 'admin' ? 'Admin Dashboard' : 'User Dashboard',
                user
            });
        } catch (err) {
            console.error("Error loading dashboard:", err);
            res.redirect('/login');
        }
    });

module.exports = router;
