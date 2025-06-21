const Notification = require('../models/notification');

// Create a new notification
const createNotification = async (recipientId, senderId, type, content, reference, referenceType) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      sender: senderId,
      type,
      content,
      reference,
      referenceType
    });
    await notification.save();
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Mark a notification as read
const markAsRead = async (notificationId) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Delete a notification
const deleteNotification = async (notificationId) => {
  try {
    await Notification.findByIdAndDelete(notificationId);
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

// Get notifications for a user
const getUserNotifications = async (userId, limit = 5) => {
  try {
    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(limit);
    return notifications;
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    throw error;
  }
};

module.exports = {
  createNotification,
  markAsRead,
  deleteNotification,
  getUserNotifications
}; 