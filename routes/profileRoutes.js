const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Badge = require('../models/badge');
const ForumPost = require('../models/forumPost');
const Course = require('../models/course');
const Notification = require('../models/notification');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ensureAuthenticated } = require('../middleware/authMiddleware');

// Set up multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/profile';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use user ID + timestamp to ensure unique filenames
    const userId = req.session.user._id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Set up the multer upload object with file type validation
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
  fileFilter: function (req, file, cb) {
    // Accept only images
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Set up multer for handling expert application documents
const expertDocsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/expert-docs';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use user ID + timestamp to ensure unique filenames
    const userId = req.session.user._id;
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `expert-doc-${userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const expertDocsUpload = multer({ 
  storage: expertDocsStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max file size
  fileFilter: function (req, file, cb) {
    // Accept common document types
    const filetypes = /pdf|doc|docx|txt|png|jpg|jpeg/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, Word, text, and image files are allowed!'));
  }
});

// View profile
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    // Fetch the user with populated data
    const user = await User.findById(userId)
      .populate('badges')
      .populate({
        path: 'completedCourses',
        model: 'Course'
      })
      .populate({
        path: 'forumPosts',
        model: 'ForumPost',
        options: { sort: { createdAt: -1 }, limit: 5 }
      })
      .populate({
        path: 'enrolledCourses.course',
        model: 'Course'
      });
    
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/dashboard');
    }

    // Fetch notifications for the user
    const notifications = await Notification.find({ recipient: userId })
        .populate('sender', 'username profileImage')
        .sort({ createdAt: -1 })
        .limit(5);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    // Pass the user data to the profile view
    res.render('profile', { 
      user, 
      activePage: 'profile',
      expertRequestStatus: user.expertRequestStatus,
      notifications,
      unreadCount,
      isOwnProfile: true
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    req.flash('error', 'An error occurred. Please try again later.');
    res.redirect('/dashboard');
  }
});

// Update profile information
router.post('/update', ensureAuthenticated, upload.single('profileImage'), async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { username, email, bio } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/profile');
    }
    
    // Update basic info
    if (username) user.username = username;
    
    // Update bio if provided
    if (bio !== undefined) user.bio = bio;
    
    // Update email if provided and different
    if (email && email !== user.email) {
      // Check if email is already in use
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== userId) {
        req.flash('error', 'Email address is already in use');
        return res.redirect('/profile');
      }
      user.email = email;
    }
    
    // Update profile image if provided
    if (req.file) {
      // Store path to the uploaded image
      user.profileImage = `/uploads/profile/${req.file.filename}`;
    }
    
    // Save updated user
    await user.save();
    
    req.flash('success', 'Profile updated successfully');
    res.redirect('/profile');
  } catch (error) {
    console.error('Error updating profile:', error);
    req.flash('error', 'An error occurred. Please try again later.');
    res.redirect('/profile');
  }
});

// Change password
router.post('/change-password', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/profile');
    }
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/profile');
    }
    
    // Confirm new password
    if (newPassword !== confirmPassword) {
      req.flash('error', 'New passwords do not match');
      return res.redirect('/profile');
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    req.flash('success', 'Password changed successfully');
    res.redirect('/profile');
  } catch (error) {
    console.error('Error changing password:', error);
    req.flash('error', 'An error occurred. Please try again later.');
    res.redirect('/profile');
  }
});

// Submit expert request
router.post('/request-expert', ensureAuthenticated, expertDocsUpload.array('documents', 5), async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { message } = req.body;
    
    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      req.flash('error', 'User not found');
      return res.redirect('/profile');
    }
    
    // Update expert request status
    user.expertRequestStatus = 'pending';
    
    // Store uploaded documents info
    const documents = req.files.map(file => ({
      filename: file.filename,
      path: `/uploads/expert-docs/${file.filename}`,
      originalName: file.originalname,
      mimeType: file.mimetype
    }));
    
    // Add expert request details
    user.expertRequest = {
      message,
      documents,
      submittedAt: Date.now()
    };
    
    await user.save();
    
    req.flash('success', 'Expert request submitted successfully. You will be notified when it is reviewed.');
    res.redirect('/profile');
  } catch (error) {
    console.error('Error submitting expert request:', error);
    req.flash('error', 'An error occurred. Please try again later.');
    res.redirect('/profile');
  }
});

// Get user badges
router.get('/badges', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.user._id;
    
    // Find user badges
    const user = await User.findById(userId).populate('badges');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ badges: user.badges });
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ message: 'An error occurred' });
  }
});

module.exports = router;