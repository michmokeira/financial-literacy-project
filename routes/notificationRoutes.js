const express = require('express');
const router = express.Router();
const Notification = require('../models/notification');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const { createNotification, markAsRead, deleteNotification, getUserNotifications } = require('../utils/notificationHelper');

// Get notifications page
router.get('/page', ensureAuthenticated, async (req, res) => {
    try {
        const notifications = await getUserNotifications(req.session.user._id, 50);
        res.render('notifications', {
            user: req.session.user,
            notifications,
            unreadCount: notifications.filter(n => !n.isRead).length,
            activePage: 'notifications'
        });
    } catch (error) {
        console.error('Error fetching notifications page:', error);
        req.flash('error', 'Error loading notifications');
        res.redirect('/dashboard');
    }
});

// Get recent notifications for dropdown
router.get('/recent', ensureAuthenticated, async (req, res) => {
    try {
        const notifications = await getUserNotifications(req.session.user._id, 5);
        res.json({
            success: true,
            notifications,
            unreadCount: notifications.filter(n => !n.isRead).length
        });
    } catch (error) {
        console.error('Error fetching recent notifications:', error);
        res.status(500).json({ success: false, message: 'Error fetching notifications' });
    }
});

// Get all notifications for the current user
router.get('/', ensureAuthenticated, async (req, res) => {
    try {
        const notifications = await getUserNotifications(req.session.user._id, 50);
        res.json({
            success: true,
            notifications,
            unreadCount: notifications.filter(n => !n.isRead).length
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, message: 'Error fetching notifications' });
    }
});

// Mark a notification as read
router.put('/:id/read', ensureAuthenticated, async (req, res) => {
    try {
        const notification = await markAsRead(req.params.id);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Notification not found' });
        }
        res.json({ success: true, notification });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, message: 'Error updating notification' });
    }
});

// Mark all notifications as read
router.put('/read-all', ensureAuthenticated, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.session.user._id, isRead: false },
            { isRead: true }
        );
        res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ success: false, message: 'Error updating notifications' });
    }
});

// Delete a notification
router.delete('/:id', ensureAuthenticated, async (req, res) => {
    try {
        await deleteNotification(req.params.id);
        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ success: false, message: 'Error deleting notification' });
    }
});

// Clear all notifications
router.delete('/clear-all', ensureAuthenticated, async (req, res) => {
    try {
        await Notification.deleteMany({ recipient: req.session.user._id });
        res.json({ success: true, message: 'All notifications cleared' });
    } catch (error) {
        console.error('Error clearing notifications:', error);
        res.status(500).json({ success: false, message: 'Error clearing notifications' });
    }
});

module.exports = router; 