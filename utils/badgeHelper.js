/**
 * Utility functions for handling badge awards
 */
const User = require('../models/user');
const Badge = require('../models/badge');
const Blog = require('../models/blog');
const mongoose = require('mongoose');
const { createNotification } = require('./notificationHelper');

/**
 * Check and award blog milestone badges to an expert
 * @param {string} userId - The user ID to check badges for
 * @returns {Promise<Array>} - Array of awarded badges (if any)
 */
exports.checkAndAwardBlogBadges = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'expert') return [];
    
    // Count total blog posts
    const totalBlogPosts = await Blog.countDocuments({ author: userId });
    
    // Count total likes on blog posts
    const totalLikes = await Blog.aggregate([
      { $match: { author: new mongoose.Types.ObjectId(userId) } },
      { $project: { likeCount: { $size: { $ifNull: ["$likes", []] } } } },
      { $group: { _id: null, total: { $sum: "$likeCount" } } }
    ]);
    
    const totalBlogLikes = totalLikes.length > 0 ? totalLikes[0].total : 0;
    
    // Define badges to check
    const badgesToCheck = [
      {
        threshold: 10,
        type: 'achievement',
        name: 'Prolific Author',
        description: 'Published 10 or more blog posts',
        image: '/images/badges/prolific-author.png',
        criteriaField: totalBlogPosts,
        badgeType: 'blog-posts-10'
      },
      {
        threshold: 25,
        type: 'achievement',
        name: 'Expert Author',
        description: 'Published 25 or more blog posts',
        image: '/images/badges/expert-author.png',
        criteriaField: totalBlogPosts,
        badgeType: 'blog-posts-25'
      },
      {
        threshold: 50,
        type: 'achievement',
        name: 'Blog Master',
        description: 'Published 50 or more blog posts',
        image: '/images/badges/blog-master.png',
        criteriaField: totalBlogPosts,
        badgeType: 'blog-posts-50'
      },
      {
        threshold: 100,
        type: 'achievement',
        name: 'Liked Content Creator',
        description: 'Received 100 or more likes on your blog posts',
        image: '/images/badges/liked-content.png',
        criteriaField: totalBlogLikes,
        badgeType: 'blog-likes-100'
      },
      {
        threshold: 500,
        type: 'achievement',
        name: 'Trending Author',
        description: 'Received 500 or more likes on your blog posts',
        image: '/images/badges/trending-author.png',
        criteriaField: totalBlogLikes,
        badgeType: 'blog-likes-500'
      }
    ];
    
    const awardedBadges = [];
    
    // Check each badge and award if criteria met
    for (const badgeConfig of badgesToCheck) {
      if (badgeConfig.criteriaField >= badgeConfig.threshold) {
        // Check if badge already exists
        let badge = await Badge.findOne({ name: badgeConfig.name });
        
        if (!badge) {
          // Create the badge if it doesn't exist
          badge = new Badge({
            name: badgeConfig.name,
            description: badgeConfig.description,
            image: badgeConfig.image,
            type: badgeConfig.type,
            criteria: `${badgeConfig.description}`
          });
          
          await badge.save();
        }
        
        // Check if user already has this badge
        if (!user.badges.includes(badge._id)) {
          // Award the badge to the user
          user.badges.push(badge._id);
          awardedBadges.push(badge);
          
          // Add user to badge's earnedBy list
          if (!badge.earnedBy.some(eb => eb.user && eb.user.toString() === userId.toString())) {
            badge.earnedBy.push({
              user: userId,
              dateEarned: new Date()
            });
            
            await badge.save();
          }
          
          // Create a notification
          await createNotification(
            userId,
            userId,
            'badge_earned',
            `Congratulations! You've earned the "${badge.name}" badge.`,
            badge._id,
            'Badge'
          );
        }
      }
    }
    
    if (awardedBadges.length > 0) {
      await user.save();
    }
    
    return awardedBadges;
  } catch (error) {
    console.error('Error checking blog badges:', error);
    return [];
  }
}; 