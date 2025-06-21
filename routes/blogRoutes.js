const express = require('express');
const router = express.Router();
const Blog = require('../models/blog');
const User = require('../models/user');
const Notification = require('../models/notification');
const { ensureAuthenticated, isExpert, ensureAdmin, isAuthenticated } = require('../middleware/authMiddleware');
const { createNotification } = require('../utils/notificationHelper');
const blogController = require('../controllers/blogController');


// Public routes
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;

    // Get filter parameters
    const search = req.query.search || '';
    const category = req.query.category || '';
    const sort = req.query.sort || 'newest';

    // Build query based on filters
    const query = { status: 'published' };
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }

    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'most_views':
        sortOptions = { views: -1 };
        break;
      case 'most_likes':
        sortOptions = { 'likes.length': -1 };
        break;
      case 'most_comments':
        sortOptions = { 'comments.length': -1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
    }

    // Get total count for pagination
    const totalCount = await Blog.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Get blog posts with pagination
    const blogPosts = await Blog.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('author', 'username profileImage');

    // Get notifications for the user if logged in
    let notifications = [];
    let unreadCount = 0;
    if (req.session.user) {
      notifications = await Notification.find({ recipient: req.session.user._id })
        .populate('sender', 'username profileImage')
        .sort({ createdAt: -1 })
        .limit(5);
      unreadCount = notifications.filter(n => !n.isRead).length;
    }

    res.render('blog/index', {
      blogPosts,
      user: req.session.user,
      currentPage: page,
      totalPages,
      query: { search, category, sort },
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error loading blog posts:', error);
    req.flash('error', 'An error occurred while loading blog posts.');
    res.redirect('/');
  }
});

// Expert routes - must come before generic :id route
router.get('/expert', ensureAuthenticated, isExpert, async (req, res) => {
  try {
    const userId = req.session.user._id;
    const tab = req.query.tab || 'published';  // Get tab from query params, default to 'published'
    const page = parseInt(req.query.page) || 1;
    const limit = 9; // Items per page
    const skip = (page - 1) * limit;
    
    // Get filter parameters
    const search = req.query.search || '';
    const category = req.query.category || '';
    const sort = req.query.sort || 'newest';

    // Build query based on filters
    const buildQuery = (baseQuery = {}) => {
      const query = { ...baseQuery };
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (category) {
        query.category = category;
      }
      
      return query;
    };

    // Build sort options
    const getSortOptions = () => {
      switch (sort) {
        case 'oldest':
          return { createdAt: 1 };
        case 'most_views':
          return { views: -1 };
        case 'most_likes':
          return { 'likes.length': -1 };
        case 'most_comments':
          return { 'comments.length': -1 };
        case 'newest':
        default:
          return { createdAt: -1 };
      }
    };
    
    // Get total counts for pagination
    const totalPublishedCount = await Blog.countDocuments(buildQuery({ 
      author: userId,
      status: 'published'
    }));
    
    const totalDraftCount = await Blog.countDocuments(buildQuery({ 
      author: userId,
      status: 'draft'
    }));
    
    // Get total count of all published blogs for timeline
    const totalTimelineCount = await Blog.countDocuments(buildQuery({
      status: 'published'
    }));
    
    // Calculate total pages
    const totalPages = Math.ceil(totalPublishedCount / limit);
    const totalDraftPages = Math.ceil(totalDraftCount / limit);
    const totalTimelinePages = Math.ceil(totalTimelineCount / limit);
    
    // Get published posts with pagination (expert's own posts)
    const publishedPosts = await Blog.find(buildQuery({ 
      author: userId,
      status: 'published'
    }))
    .sort(getSortOptions())
    .skip(tab === 'published' ? skip : 0)
    .limit(tab === 'published' ? limit : totalPublishedCount)
    .populate('author', 'username profileImage');
    
    // Get draft posts with pagination
    const draftPosts = await Blog.find(buildQuery({ 
      author: userId,
      status: 'draft'
    }))
    .sort(getSortOptions())
    .skip(tab === 'drafts' ? skip : 0)
    .limit(tab === 'drafts' ? limit : totalDraftCount)
    .populate('author', 'username profileImage');
    
    // Get timeline posts (all published posts from all users)
    const timelinePosts = await Blog.find(buildQuery({
      status: 'published'
    }))
    .sort(getSortOptions())
    .skip(tab === 'timeline' ? skip : 0)
    .limit(tab === 'timeline' ? limit : 0)
    .populate('author', 'username profileImage');
    
    // All blogs for statistics
    const allBlogs = await Blog.find({ author: userId });
    
    // Calculate statistics
    const stats = {
      totalPosts: allBlogs.length,
      publishedPosts: totalPublishedCount,
      draftPosts: totalDraftCount,
      totalViews: allBlogs.reduce((sum, post) => sum + (post.views || 0), 0),
      totalLikes: allBlogs.reduce((sum, post) => sum + (post.likes ? post.likes.length : 0), 0),
      totalComments: allBlogs.reduce((sum, post) => sum + (post.comments ? post.comments.length : 0), 0)
    };

    res.render('expert/blogs/index', {
      publishedPosts,
      draftPosts,
      timelinePosts,
      stats,
      user: req.session.user,
      activePage: 'blog',
      tab,
      currentPage: page,
      currentDraftPage: page,
      currentTimelinePage: page,
      totalPages,
      totalDraftPages,
      totalTimelinePages,
      query: { search, category, sort } // Pass query parameters to the view
    });
  } catch (error) {
    console.error('Error loading expert blog management:', error);
    req.flash('error', 'An error occurred while loading your blog posts.');
    res.redirect('/expert/dashboard');
  }
});

router.get('/expert/edit/:id', ensureAuthenticated, isExpert, blogController.getBlogEdit);
router.post('/expert/edit/:id', ensureAuthenticated, isExpert, blogController.updateBlog);

// Add delete route for blog posts
router.post('/expert/delete/:id', ensureAuthenticated, isExpert, async (req, res) => {
  try {
    const blog = await Blog.findOne({
      _id: req.params.id,
      author: req.session.user._id
    });

    if (!blog) {
      req.flash('error', 'Blog post not found or you do not have permission to delete it');
      return res.redirect('/blog/expert');
    }

    await blog.deleteOne();
    req.flash('success', 'Blog post deleted successfully');
    res.redirect('/blog/expert');
  } catch (error) {
    console.error('Error deleting blog post:', error);
    req.flash('error', 'An error occurred while deleting the blog post');
    res.redirect('/blog/expert');
  }
});

// Add routes for blog creation form
router.get('/expert/create', ensureAuthenticated, isExpert, (req, res) => {
  try {
    res.render('expert/blogs/create', {
      user: req.session.user,
      activePage: 'blog',
      isNewDraft: false
    });
  } catch (error) {
    console.error('Error loading blog creation form:', error);
    req.flash('error', 'An error occurred while loading the blog creation form.');
    res.redirect('/blog/expert');
  }
});

// Handle blog post creation form submission
router.post('/expert/create', ensureAuthenticated, isExpert, async (req, res) => {
  try {
    const { title, category, content, status } = req.body;
    const author = req.session.user._id;

    // Create new blog post
    const newBlog = new Blog({
      title,
      category,
      content,
      author,
      status: status || 'draft',
      createdAt: new Date(),
      publishedAt: status === 'published' ? new Date() : null
    });

    await newBlog.save();

    req.flash('success', status === 'published' 
      ? 'Blog post published successfully!' 
      : 'Blog post saved as a draft.'
    );
    
    res.redirect('/blog/expert');
  } catch (error) {
    console.error('Error creating blog post:', error);
    req.flash('error', 'An error occurred while creating your blog post.');
    res.redirect('/blog/expert/create');
  }
});

// Alias for /expert/create to support the "Create New Draft" button
router.get('/expert/new', ensureAuthenticated, isExpert, (req, res) => {
  try {
    res.render('expert/blogs/create', {
      user: req.session.user,
      activePage: 'blog',
      isNewDraft: true
    });
  } catch (error) {
    console.error('Error loading blog creation form:', error);
    req.flash('error', 'An error occurred while loading the blog creation form.');
    res.redirect('/blog/expert');
  }
});

router.get('/expert/:id', ensureAuthenticated, isExpert, blogController.getBlogPost);
router.get('/drafts', ensureAuthenticated, isExpert, blogController.getDrafts);
router.post('/', ensureAuthenticated, isExpert, blogController.createBlog);

// Admin routes
router.get('/flagged', ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const flaggedBlogs = await Blog.find({
      'flags.status': 'pending'
    })
    .populate('author', 'username profileImage')
    .populate('flags.user', 'username profileImage')
    .sort({ 'flags.createdAt': -1 });

    res.render('admin/flagged-blogs', { 
      blogs: flaggedBlogs,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error fetching flagged posts:', err);
    res.status(500).render('error', { message: 'Error fetching flagged posts' });
  }
});

// Blog post routes - specific routes first
router.post('/:id/like', isAuthenticated, blogController.likeBlog);
router.post('/:id/comment', isAuthenticated, blogController.commentOnBlog);
router.post('/:id/comment/:commentId/reply', isAuthenticated, blogController.replyToComment);
router.post('/:id/comment/:commentId/edit', isAuthenticated, blogController.editComment);
router.post('/:id/comment/:commentId/reply/:replyId/edit', isAuthenticated, blogController.editReply);
router.post('/:id/comment/:commentId/delete', isAuthenticated, blogController.deleteComment);
router.post('/:id/comment/:commentId/reply/:replyId/delete', isAuthenticated, blogController.deleteReply);
router.post('/:id/flag', isAuthenticated, blogController.flagBlog);

// Generic blog post route last
router.get('/:id', ensureAuthenticated, blogController.getBlogPost);

module.exports = router;