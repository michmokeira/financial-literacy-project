const express = require('express');
const router = express.Router();
const ForumPost = require('../models/forumPost');
const User = require('../models/user');
const Comment = require('../models/comment');
const Notification = require('../models/notification');
const { ensureAuthenticated, ensureAdmin } = require('../middleware/authMiddleware');
const { createNotification } = require('../utils/notificationHelper');

// GET all forum posts (with optional filtering)
router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    let query = {};
    let sort = { createdAt: -1 }; // Default sort by newest
    
    // Apply filters if present
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    if (req.query.tag) {
      query.tags = req.query.tag;
    }
    
    if (req.query.search) {
      // Search in title and content using text index
      query.$text = { $search: req.query.search };
      // Add text score for sorting by relevance
      sort = { score: { $meta: "textScore" } };
    }
    
    // Apply author filter if present
    if (req.query.author) {
      query.author = req.query.author;
    }
    
    // Apply sorting options
    if (req.query.sort) {
      switch (req.query.sort) {
        case 'newest':
          sort = { createdAt: -1 };
          break;
        case 'oldest':
          sort = { createdAt: 1 };
          break;
        case 'popular':
          sort = { views: -1 };
          break;
        case 'mostComments':
          sort = { 'comments.length': -1 };
          break;
      }
    }
    
    // Get pinned posts separately
    const pinnedPosts = await ForumPost.find({ isPinned: true })
      .populate('author', 'username profileImage role')
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Get featured posts separately
    const featuredPosts = await ForumPost.find({ isFeatured: true })
      .populate('author', 'username profileImage role')
      .sort({ createdAt: -1 })
      .limit(3);
    
    // Get regular posts with pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Exclude pinned posts from regular query
    if (!req.query.sort && !req.query.search) {
      query.isPinned = { $ne: true };
    }
    
    const posts = await ForumPost.find(query)
      .populate('author', 'username profileImage role')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total post count for pagination
    const totalPosts = await ForumPost.countDocuments(query);
    const totalPages = Math.ceil(totalPosts / limit);
    
    // Get categories for the sidebar
    const categories = await ForumPost.distinct('category');
    
    // Get popular tags for the sidebar (top 10)
    const tags = await ForumPost.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Format posts to include metadata
    const formattedPosts = posts.map(post => {
      return {
        ...post,
        commentCount: post.comments ? post.comments.length : 0,
        likeCount: post.likes ? post.likes.length : 0,
        createdAtFormatted: new Date(post.createdAt).toLocaleDateString(),
        isLiked: req.session.user ? post.likes.some(like => like.toString() === req.session.user._id) : false
      };
    });
    
    // Fetch notifications for the user
    const notifications = await Notification.find({ recipient: req.session.user._id })
      .populate('sender', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(5);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    // Render the forum page
    res.render('forum/index', {
      title: 'Forum | Financial Literacy Platform',
      posts: formattedPosts,
      pinnedPosts,
      featuredPosts,
      categories,
      tags,
      pagination: {
        page,
        limit,
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1
      },
      activePage: 'forum',
      filters: {
        category: req.query.category,
        tag: req.query.tag,
        search: req.query.search,
        sort: req.query.sort
      },
      user: req.session.user,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching forum posts:', error);
    req.flash('error', 'An error occurred while loading the forum. Please try again later.');
    res.redirect('/dashboard');
  }
});

// GET form to create a new forum post
router.get('/create', ensureAuthenticated, async (req, res) => {
  try {
    // Get categories for the dropdown
    const categories = await ForumPost.distinct('category');
    
    // Fetch notifications for the user
    const notifications = await Notification.find({ recipient: req.session.user._id })
      .populate('sender', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(5);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    res.render('forum/create', {
      title: 'Create Forum Post',
      categories,
      activePage: 'forum',
      user: req.session.user,
      notifications,
      unreadCount,
      filters: {
        category: '',
        tag: '',
        search: '',
        sort: ''
      }
    });
  } catch (error) {
    console.error('Error loading post creation form:', error);
    req.flash('error', 'An error occurred. Please try again later.');
    res.redirect('/forum');
  }
});

// POST reply to a comment
router.post('/post/:postId/comment/:commentId/reply', ensureAuthenticated, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    const userId = req.session.user._id;

    if (!content) {
      req.flash('error', 'Reply content is required');
      return res.redirect(`/forum/post/${postId}`);
    }

    const post = await ForumPost.findById(postId);
    if (!post) {
      req.flash('error', 'Post not found');
      return res.redirect('/forum');
    }

    // Find the comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      req.flash('error', 'Comment not found');
      return res.redirect(`/forum/post/${postId}`);
    }

    // Create new reply
    comment.replies.push({
      user: userId,
      content,
      createdAt: new Date()
    });

    await post.save();

    // Create notification for comment author
    if (comment.user.toString() !== userId.toString()) {
      await createNotification(
        comment.user,
        userId,
        'comment_reply',
        `replied to your comment on "${post.title}"`,
        comment._id,
        'Comment'
      );
    }

    req.flash('success', 'Reply added successfully');
    res.redirect(`/forum/post/${postId}`);
  } catch (error) {
    console.error('Error adding reply:', error);
    req.flash('error', 'Failed to add reply');
    res.redirect(`/forum/post/${req.params.postId}`);
  }
});

// POST delete a reply
router.post('/post/:postId/comment/:commentId/reply/:replyId/delete', ensureAuthenticated, async (req, res) => {
  try {
    const { postId, commentId, replyId } = req.params;
    const userId = req.session.user._id;

    const post = await ForumPost.findById(postId);
    if (!post) {
      req.flash('error', 'Post not found');
      return res.redirect('/forum');
    }

    // Find the comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      req.flash('error', 'Comment not found');
      return res.redirect(`/forum/post/${postId}`);
    }

    // Find the reply
    const reply = comment.replies.id(replyId);
    if (!reply) {
      req.flash('error', 'Reply not found');
      return res.redirect(`/forum/post/${postId}`);
    }

    // Check if user is the reply author or an admin
    if (reply.user.toString() !== userId.toString() && req.session.user.role !== 'admin') {
      req.flash('error', 'You do not have permission to delete this reply');
      return res.redirect(`/forum/post/${postId}`);
    }

    // Remove the reply
    comment.replies.pull(replyId);
    await post.save();

    req.flash('success', 'Reply deleted successfully');
    res.redirect(`/forum/post/${postId}`);
  } catch (error) {
    console.error('Error deleting reply:', error);
    req.flash('error', 'Failed to delete reply');
    res.redirect(`/forum/post/${req.params.postId}`);
  }
});

// POST create a new forum post
router.post('/create', ensureAuthenticated, async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;
    const userId = req.session.user._id;
    
    // Basic validation
    if (!title || !content || !category) {
      req.flash('error', 'Title, content, and category are required');
      return res.redirect('/forum/create');
    }

    // Create the post
    const post = new ForumPost({
      title,
      content,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      author: userId
    });

    await post.save();

    // Update user's forumPosts array
    await User.findByIdAndUpdate(userId, {
      $push: { forumPosts: post._id }
    });

    // Check for badge eligibility
    const user = await User.findById(userId);
    const forumPostCount = user.forumPosts.length;

    // Award "First Post" badge
    if (forumPostCount === 1 && !user.badges.some(b => b.name === 'First Post')) {
      const firstPostBadge = {
        name: "First Post",
        description: "Made your first forum post",
        type: "forum",
        image: "/images/badges/first-post.png",
        earnedBy: [{
          user: userId,
          dateEarned: new Date()
        }]
      };
      
      await User.findByIdAndUpdate(userId, {
        $push: { badges: firstPostBadge }
      });
    }
    
    // Award "Forum Contributor" badge
    if (forumPostCount === 10 && !user.badges.some(b => b.name === 'Forum Contributor')) {
      const forumContributorBadge = {
        name: "Forum Contributor",
        description: "Made 10 forum posts",
        type: "forum",
        image: "/images/badges/forum-contributor.png",
        earnedBy: [{
          user: userId,
          dateEarned: new Date()
        }]
      };
      
      await User.findByIdAndUpdate(userId, {
        $push: { badges: forumContributorBadge }
      });
    }
    
    // Award "Forum Expert" badge
    if (forumPostCount === 50 && !user.badges.some(b => b.name === 'Forum Expert')) {
      const forumExpertBadge = {
        name: "Forum Expert",
        description: "Made 50 forum posts",
        type: "forum",
        image: "/images/badges/forum-expert.png",
        earnedBy: [{
          user: userId,
          dateEarned: new Date()
        }]
      };
      
      await User.findByIdAndUpdate(userId, {
        $push: { badges: forumExpertBadge }
      });
    }

    req.flash('success', 'Post created successfully');
    res.redirect('/forum');
  } catch (error) {
    console.error('Error creating forum post:', error);
    req.flash('error', 'Failed to create post');
    res.redirect('/forum/create');
  }
});

// GET view a specific forum post
router.get('/post/:postId', ensureAuthenticated, async (req, res) => {
  try {
    const postId = req.params.postId;

    if (!postId) {
      req.flash('error', 'Post ID is required.');
      return res.redirect('/forum');
    }

    // Increment view count and populate author data
    const post = await ForumPost.findByIdAndUpdate(
      postId,
      { $inc: { views: 1 } },
      { new: true }
    )
    .populate('author', 'username profileImage role')
    .populate({
      path: 'comments.user',
      select: 'username profileImage role'
    })
    .populate({
      path: 'comments.replies.user',
      select: 'username profileImage role'
    })
    .lean();

    if (!post) {
      req.flash('error', 'Post not found.');
      return res.redirect('/forum');
    }

    // Get similar posts (same category, excluding current post)
    const similarPosts = await ForumPost.find({
      category: post.category,
      _id: { $ne: post._id }
    })
      .populate('author', 'username profileImage role')
      .sort({ views: -1 })
      .limit(3)
      .lean();

    // Check if the user has liked the post
    const isLiked = req.session.user ? post.likes.some(like => like.toString() === req.session.user._id.toString()) : false;

    // Get categories for the sidebar
    const categories = await ForumPost.distinct('category');

    // Fetch notifications for the user
    const notifications = await Notification.find({ recipient: req.session.user._id })
      .populate('sender', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(5);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.render('forum/post', {
      title: post.title,
      post,
      similarPosts,
      isLiked,
      user: req.session.user,
      notifications,
      unreadCount,
      activePage: 'forum',
      categories,
      filters: {
        category: '',
        tag: '',
        search: ''
      }
    });
  } catch (error) {
    console.error('Error fetching forum post:', error);
    req.flash('error', 'An error occurred while loading the post. Please try again later.');
    res.redirect('/forum');
  }
});

// GET form to edit a forum post
router.get('/post/:postId', ensureAuthenticated, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.session.user._id;
    
    const post = await ForumPost.findById(postId);
    
    if (!post) {
      req.flash('error', 'Post not found.');
      return res.redirect('/forum');
    }
    
    // Check if the user is the author or an admin
    if (post.author.toString() !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'You do not have permission to edit this post.');
      return res.redirect(`/forum/post/${postId}`);
    }
    
    // Get categories for the dropdown
    const categories = await ForumPost.distinct('category');
    
    // Fetch notifications for the user
    const notifications = await Notification.find({ recipient: req.session.user._id })
      .populate('sender', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(5);

    const unreadCount = notifications.filter(n => !n.isRead).length;
    
    res.render('forum/edit', {
      title: 'Edit Forum Post',
      post,
      categories,
      tags: post.tags.join(', '),
      activePage: 'forum',
      user: req.session.user,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error loading post edit form:', error);
    req.flash('error', 'An error occurred. Please try again later.');
    res.redirect('/forum');
  }
});

// POST update a forum post
router.post('/post/:postId', ensureAuthenticated, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.session.user._id;
    const { title, content, category, tags } = req.body;
    
    const post = await ForumPost.findById(postId);
    
    if (!post) {
      req.flash('error', 'Post not found.');
      return res.redirect('/forum');
    }
    
    // Check if the user is the author or an admin
    if (post.author.toString() !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'You do not have permission to edit this post.');
      return res.redirect(`/forum/post/${postId}`);
    }
    
    // Basic validation
    if (!title || !content || !category) {
      req.flash('error', 'Title, content, and category are required.');
      return res.redirect(`/forum/post/${postId}`);
    }
    
    // Update post
    post.title = title;
    post.content = content;
    post.category = category;
    post.tags = tags ? tags.split(',').map(tag => tag.trim()) : [];
    post.isEdited = true;
    post.lastEditedAt = Date.now();
    
    await post.save();
    
    req.flash('success', 'Your post has been updated successfully!');
    res.redirect(`/forum/post/${postId}`);
  } catch (error) {
    console.error('Error updating forum post:', error);
    req.flash('error', 'An error occurred while updating your post. Please try again.');
    res.redirect(`/forum/post/${req.params.postId}`);
  }
});

// POST delete a forum post
router.post('/post/:postId/delete', ensureAuthenticated, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.session.user._id;
    
    const post = await ForumPost.findById(postId);
    
    if (!post) {
      req.flash('error', 'Post not found.');
      return res.redirect('/forum');
    }
    
    // Check if the user is the author or an admin
    if (post.author.toString() !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'You do not have permission to delete this post.');
      return res.redirect(`/forum/post/${postId}`);
    }
    
    // Remove post from user's forumPosts array
    await User.findByIdAndUpdate(post.author, {
      $pull: { forumPosts: postId }
    });
    
    // Delete the post
    await ForumPost.findByIdAndDelete(postId);
    
    req.flash('success', 'Your post has been deleted successfully!');
    res.redirect('/forum');
  } catch (error) {
    console.error('Error deleting forum post:', error);
    req.flash('error', 'An error occurred while deleting your post. Please try again.');
    res.redirect(`/forum/post/${req.params.postId}`);
  }
});

// POST add a comment to a forum post
router.post('/post/:postId/comment', ensureAuthenticated, async (req, res) => {
  try {
    const postId = req.params.postId;
    const userId = req.session.user._id;
    const { content } = req.body;
    
    // Basic validation
    if (!content) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(400).json({ message: 'Comment content is required.' });
      }
      req.flash('error', 'Comment content is required.');
      return res.redirect(`/forum/post/${postId}`);
    }
    
    const post = await ForumPost.findById(postId);
    
    if (!post) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(404).json({ message: 'Post not found.' });
      }
      req.flash('error', 'Post not found.');
      return res.redirect('/forum');
    }
    
    // Get user to determine role
    const user = await User.findById(userId);
    if (!user) {
      if (req.headers['content-type'] === 'application/json') {
        return res.status(404).json({ message: 'User not found.' });
      }
      req.flash('error', 'User not found.');
      return res.redirect('/forum');
    }
    
    // Add comment directly to the forum post
    post.comments.push({
      user: userId,
      content,
      createdAt: new Date()
    });
    
    await post.save();
    
    // Create notification for the post author
    await createNotification(
      post.author._id,
      userId,
      'comment',
      `${user.username} commented on your forum post "${post.title}"`,
      post._id,
      'ForumPost'
    );
    
    if (req.headers['content-type'] === 'application/json') {
      return res.json({ 
        success: true, 
        message: 'Comment added successfully!',
        comment: {
          content,
          user: {
            username: user.username,
            profileImage: user.profileImage,
            role: user.role
          },
          createdAt: new Date()
        }
      });
    }
    
    req.flash('success', 'Your comment has been added successfully!');
    res.redirect(`/forum/post/${postId}`);
  } catch (error) {
    console.error('Error adding comment:', error);
    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ message: 'An error occurred while adding your comment.' });
    }
    req.flash('error', 'An error occurred while adding your comment. Please try again.');
    res.redirect(`/forum/post/${req.params.postId}`);
  }
});

// POST edit a comment
router.post('/comment/:commentId/edit', ensureAuthenticated, async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.session.user._id;
    const { content } = req.body;
    
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      req.flash('error', 'Comment not found.');
      return res.redirect('/forum');
    }
    
    // Check if the user is the author or an admin
    if (comment.user.toString() !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'You do not have permission to edit this comment.');
      return res.redirect(`/forum/post/${comment.post}`);
    }
    
    // Basic validation
    if (!content) {
      req.flash('error', 'Comment content is required.');
      return res.redirect(`/forum/post/${comment.post}`);
    }
    
    // Update comment
    comment.content = content;
    comment.isEdited = true;
    comment.lastEditedAt = Date.now();
    
    await comment.save();
    
    req.flash('success', 'Your comment has been updated successfully!');
    res.redirect(`/forum/post/${comment.post}`);
  } catch (error) {
    console.error('Error updating comment:', error);
    req.flash('error', 'An error occurred while updating your comment. Please try again.');
    res.redirect('/forum');
  }
});

// POST delete a comment
router.post('/comment/:commentId/delete', ensureAuthenticated, async (req, res) => {
  try {
    const commentId = req.params.commentId;
    const userId = req.session.user._id;
    
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      req.flash('error', 'Comment not found.');
      return res.redirect('/forum');
    }
    
    // Check if the user is the author or an admin
    if (comment.user.toString() !== userId && req.session.user.role !== 'admin') {
      req.flash('error', 'You do not have permission to delete this comment.');
      return res.redirect(`/forum/post/${comment.post}`);
    }
    
    // Get the post to redirect back after deletion
    const postId = comment.post;
    
    // Remove comment from forum post
    await ForumPost.findByIdAndUpdate(postId, {
      $pull: { comments: commentId }
    });
    
    // Remove comment from user's comments array
    await User.findByIdAndUpdate(comment.user, {
      $pull: { forumComments: commentId }
    });
    
    // Delete the comment
    await Comment.findByIdAndDelete(commentId);
    
    req.flash('success', 'Your comment has been deleted successfully!');
    res.redirect(`/forum/post/${postId}`);
  } catch (error) {
    console.error('Error deleting comment:', error);
    req.flash('error', 'An error occurred while deleting your comment. Please try again.');
    res.redirect('/forum');
  }
});

// POST like/unlike a forum post
router.post('/post/:postId/like', ensureAuthenticated, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.session.user._id;

    const post = await ForumPost.findById(postId);
    if (!post) {
      req.flash('error', 'Post not found');
      return res.redirect('/forum');
    }

    const likeIndex = post.likes.indexOf(userId);
    if (likeIndex === -1) {
      // Add like
      post.likes.push(userId);
      
      // Check for Popular Post badge
      if (post.likes.length === 10) {
        const user = await User.findById(post.author);
        if (!user.badges.some(b => b.name === 'Popular Post')) {
          const popularPostBadge = {
            name: "Popular Post",
            description: "Got 10 likes on a single post",
            type: "forum",
            image: "/images/badges/popular-post.png",
            earnedBy: [{
              user: post.author,
              dateEarned: new Date()
            }]
          };
          
          await User.findByIdAndUpdate(post.author, {
            $push: { badges: popularPostBadge }
          });
        }
      }
    } else {
      // Remove like
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    res.json({ success: true, likes: post.likes.length });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle like' });
  }
});

// POST like/unlike a comment
router.post('/post/:postId/comment/:commentId/like', ensureAuthenticated, async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.session.user._id;
    
    const post = await ForumPost.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    // Find the comment
    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }
    
    // Initialize likes array if it doesn't exist
    if (!comment.likes) {
      comment.likes = [];
    }
    
    const likeIndex = comment.likes.indexOf(userId);
    if (likeIndex === -1) {
      // Add like
      comment.likes.push(userId);
      
      // Create notification for comment author if it's not their own comment
      if (comment.user.toString() !== userId.toString()) {
        await createNotification(
          comment.user,
          userId,
          'comment_like',
          `liked your comment on "${post.title}"`,
          comment._id,
          'Comment'
        );
      }
    } else {
      // Remove like
      comment.likes.splice(likeIndex, 1);
    }
    
    await post.save();
    
    res.json({ 
      success: true, 
      liked: likeIndex === -1,
      likeCount: comment.likes.length 
    });
  } catch (error) {
    console.error('Error handling comment like:', error);
    res.status(500).json({ success: false, message: 'Failed to process like' });
  }
});

// GET single forum post
router.get('/post/:id', ensureAuthenticated, async (req, res) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('author', 'username profileImage role')
      .populate({
        path: 'comments',
        populate: {
          path: 'author',
          select: 'username profileImage role'
        }
      });

    if (!post) {
      req.flash('error', 'Post not found');
      return res.redirect('/forum');
    }

    // Increment view count
    post.views = (post.views || 0) + 1;
    await post.save();

    // Get similar posts (same category, excluding current post)
    const similarPosts = await ForumPost.find({
      category: post.category,
      _id: { $ne: post._id }
    })
      .populate('author', 'username profileImage role')
      .sort({ views: -1 })
      .limit(3)
      .lean();

    // Fetch notifications for the user
    const notifications = await Notification.find({ recipient: req.session.user._id })
      .populate('sender', 'username profileImage')
      .sort({ createdAt: -1 })
      .limit(5);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.render('forum/post', {
      title: `${post.title} | Forum`,
      post,
      similarPosts,
      user: req.session.user,
      notifications,
      unreadCount,
      messages: req.flash()
    });
  } catch (error) {
    console.error('Error fetching forum post:', error);
    req.flash('error', 'An error occurred while loading the post. Please try again later.');
    res.redirect('/forum');
  }
});

module.exports = router;