const User = require('../models/user');
const express = require('express');
const router = express.Router();
const Course = require('../models/course');
const Notification = require('../models/notification');

// Middleware to protect routes
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

// Dashboard route
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.user._id)
            .populate('enrolledCourses')
            .populate('badges')
            .populate('forumPosts');

        // Fetch all courses from the database
        const courses = await Course.find();
        // Get the first 3 courses for the dashboard
        const availableCourses = courses.slice(0, 3);

        // Fetch notifications for the user
        const notifications = await Notification.find({ user: user._id }).sort({ createdAt: -1 }).limit(10);
        const unreadCount = await Notification.countDocuments({ user: user._id, read: false });

        res.render('dashboard', {
            title: user.role === 'admin' ? 'Admin Dashboard' : 'User Dashboard',
            user,
            availableCourses,
            notifications,
            unreadCount
        });
    } catch (err) {
        console.error("Error loading dashboard:", err);
        res.redirect('/login');
    }
});

module.exports = router;
