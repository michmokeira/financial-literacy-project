const User = require('../models/user');
const express = require('express');
const router = express.Router();
const Course = require('../models/course');

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

        // Get the first 3 courses for the dashboard
        const availableCourses = courses.slice(0, 3);

        res.render('dashboard', {
            title: user.role === 'admin' ? 'Admin Dashboard' : 'User Dashboard',
            user,
            availableCourses, // Pass the first 3 courses to the dashboard view
        });
    } catch (err) {
        console.error("Error loading dashboard:", err);
        res.redirect('/login');
    }
});

module.exports = router;
