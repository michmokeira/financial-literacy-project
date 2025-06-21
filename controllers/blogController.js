const Blog = require('../models/blog');
const { createNotification } = require('../utils/notificationHelper');
const Notification = require('../models/notification');
const User = require('../models/user');

// Get all published blogs with pagination, search, and sorting
exports.getAllBlogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const category = req.query.category;
    const sortBy = req.query.sortBy || 'recent';
    
    const query = {
      status: 'published',
      isHidden: false
    };

    if (search) {
      query.$text = { $search: search };
    }

    if (category) {
      query.category = category;
    }

    let sort = {};
    if (sortBy === 'popular') {
      sort = { views: -1 };
    } else {
      sort = { createdAt: -1 };
    }

    const blogPosts = await Blog.find(query)
      .populate('author', 'username profileImage')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Blog.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

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
      currentPage: page,
      totalPages,
      totalBlogs: total,
      user: req.session.user || null,
      notifications,
      unreadCount,
      activePage: 'blog'
    });
  } catch (err) {
    console.error('Error fetching blogs:', err);
    res.status(500).render('error', { 
      message: 'Error fetching blogs',
      notifications: [],
      unreadCount: 0
    });
  }
};

// Get single blog post
exports.getBlogPost = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'username profileImage')
      .populate({
        path: 'comments.user',
        select: 'username profileImage role'
      })
      .populate({
        path: 'comments.replies.user',
        select: 'username profileImage role'
      });
    
    if (!blog) {
      return res.status(404).render('error', { 
        message: 'Blog post not found',
        error: { status: 404 }
      });
    }

    // Ensure comments array exists and populate content
    if (!blog.comments) {
      blog.comments = [];
    }

    // Ensure replies array exists for each comment and populate content
    blog.comments.forEach(comment => {
      if (!comment.replies) {
        comment.replies = [];
      }
      // Make sure content is available
      if (!comment.content) {
        comment.content = comment.text || ''; // Fallback to text if content doesn't exist
      }
      // Make sure content is available for replies
      comment.replies.forEach(reply => {
        if (!reply.content) {
          reply.content = reply.text || ''; // Fallback to text if content doesn't exist
        }
      });
    });

    // Increment view count
    blog.views += 1;
    await blog.save();

    // Check if user has liked the post
    const isLiked = req.session.user ? blog.likes.includes(req.session.user._id) : false;

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
    
    // Determine which view to render based on user role
    const viewTemplate = (req.session.user && req.session.user.role === 'expert') 
      ? 'expert/blogs/singleBlog' 
      : 'blog/singleBlogContent';

    res.render(viewTemplate, {
      blog,
      user: req.session.user,
      isLiked,
      notifications,
      unreadCount,
      activePage: 'blog'
    });
  } catch (error) {
    console.error('Error getting blog post:', error);
    res.status(500).render('error', { 
      message: 'Error retrieving blog post',
      error: { status: 500 }
    });
  }
};

// Create new blog (experts only)
exports.createBlog = async (req, res) => {
  try {
    const { title, content, tags, category, status = 'published' } = req.body;
    const userId = req.session.user._id;

      const blog = new Blog({
      title,
      content,
      author: userId,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      category,
      status: status || 'published',
      editedAt: new Date()
    });

    await blog.save();

    if (status === 'published') {
      req.flash('success', 'Blog post published successfully!');
      res.redirect(`/blog/${blog._id}`);
    } else {
      req.flash('success', 'Blog post saved as draft successfully!');
      res.redirect('/expert/blog');
    }
  } catch (err) {
    console.error('Error creating blog:', err);
    req.flash('error', 'Error creating blog post');
    res.redirect('/expert/blog/create');
  }
};

// Like a blog post
exports.likeBlog = async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('author', 'username');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const likeIndex = blog.likes.indexOf(req.session.user._id);
    if (likeIndex === -1) {
      blog.likes.push(req.session.user._id);
      await blog.save();

      // Create notification for the blog author
      await createNotification(
        blog.author._id,
        req.session.user._id,
        'like',
        `${req.session.user.username} liked your blog post "${blog.title}"`,
        blog._id,
        'Blog'
      );

      res.json({ message: 'Blog post liked successfully' });
    } else {
      blog.likes.splice(likeIndex, 1);
      await blog.save();
      res.json({ message: 'Blog post unliked successfully' });
    }
  } catch (err) {
    console.error('Error liking blog:', err);
    res.status(500).json({ message: 'Error liking blog post' });
  }
};

// Comment on a blog post
exports.commentOnBlog = async (req, res) => {
  try {
    const { content } = req.body;
    const blogId = req.params.id;
    const userId = req.session.user._id;

    if (!content) {
      req.flash('error', 'Comment cannot be empty');
      return res.redirect(`/blog/${blogId}`);
    }

    const blog = await Blog.findById(blogId)
      .populate('author', 'username');
    
    if (!blog) {
      req.flash('error', 'Blog post not found');
      return res.redirect('/blog');
    }

    // Add the comment
    blog.comments.push({
      content,
      user: userId,
      createdAt: new Date()
    });

    await blog.save();

    // Create notification for the blog author if the commenter is not the author
    if (blog.author._id.toString() !== userId.toString()) {
      await createNotification(
        blog.author._id,
        userId,
        'comment',
        `${req.session.user.username} commented on your blog post "${blog.title}"`,
        blog._id,
        'Blog'
      );
    }

    req.flash('success', 'Comment added successfully');
    res.redirect(`/blog/${blogId}`);
  } catch (err) {
    console.error('Error adding comment:', err);
    req.flash('error', 'Error adding comment');
    res.redirect(`/blog/${req.params.id}`);
  }
};

// Reply to a comment
exports.replyToComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { id: blogId, commentId } = req.params;
    const userId = req.session.user._id;

    if (!content) {
      req.flash('error', 'Reply cannot be empty');
      return res.redirect(`/blog/${blogId}`);
    }

    const blog = await Blog.findById(blogId)
      .populate('author', 'username');

    if (!blog) {
      req.flash('error', 'Blog post not found');
      return res.redirect('/blog');
    }

    const comment = blog.comments.id(commentId);
    if (!comment) {
      req.flash('error', 'Comment not found');
      return res.redirect(`/blog/${blogId}`);
    }

    // Add the reply
    comment.replies.push({
      content,
      user: userId,
      createdAt: new Date()
    });

    await blog.save();

    // Create notification for the comment author if the replier is not the author
    if (comment.user.toString() !== userId.toString()) {
      await createNotification(
        comment.user,
        userId,
        'reply',
        `${req.session.user.username} replied to your comment on "${blog.title}"`,
        comment._id,
        'Comment'
      );
    }

    req.flash('success', 'Reply added successfully');
    res.redirect(`/blog/${blogId}`);
  } catch (err) {
    console.error('Error adding reply:', err);
    req.flash('error', 'Error adding reply');
    res.redirect(`/blog/${req.params.id}`);
  }
};

// Edit a comment
exports.editComment = async (req, res) => {
  try {
    const { content } = req.body;
    const { id: blogId, commentId } = req.params;
    const userId = req.session.user._id;

    if (!content) {
      req.flash('error', 'Comment cannot be empty');
      return res.redirect(`/blog/${blogId}`);
    }

    const blog = await Blog.findById(blogId);
    if (!blog) {
      req.flash('error', 'Blog post not found');
      return res.redirect('/blog');
    }

    const comment = blog.comments.id(commentId);
    if (!comment) {
      req.flash('error', 'Comment not found');
      return res.redirect(`/blog/${blogId}`);
    }

    // Check if user is the comment author
    if (comment.user.toString() !== userId.toString()) {
      req.flash('error', 'You can only edit your own comments');
      return res.redirect(`/blog/${blogId}`);
    }

    // Update the comment
    comment.content = content;
    comment.editedAt = new Date();

    await blog.save();
    req.flash('success', 'Comment updated successfully');
    res.redirect(`/blog/${blogId}`);
  } catch (err) {
    console.error('Error editing comment:', err);
    req.flash('error', 'Error updating comment');
    res.redirect(`/blog/${req.params.id}`);
  }
};

// Edit a reply
exports.editReply = async (req, res) => {
  try {
    const { content } = req.body;
    const { id: blogId, commentId, replyId } = req.params;
    const userId = req.session.user._id;

    if (!content) {
      req.flash('error', 'Reply cannot be empty');
      return res.redirect(`/blog/${blogId}`);
    }

    const blog = await Blog.findById(blogId);
    if (!blog) {
      req.flash('error', 'Blog post not found');
      return res.redirect('/blog');
    }

    const comment = blog.comments.id(commentId);
    if (!comment) {
      req.flash('error', 'Comment not found');
      return res.redirect(`/blog/${blogId}`);
    }

    const reply = comment.replies.id(replyId);
    if (!reply) {
      req.flash('error', 'Reply not found');
      return res.redirect(`/blog/${blogId}`);
    }

    // Check if user is the reply author
    if (reply.user.toString() !== userId.toString()) {
      req.flash('error', 'You can only edit your own replies');
      return res.redirect(`/blog/${blogId}`);
    }

    // Update the reply
    reply.content = content;
    reply.editedAt = new Date();

    await blog.save();
    req.flash('success', 'Reply updated successfully');
    res.redirect(`/blog/${blogId}`);
  } catch (err) {
    console.error('Error editing reply:', err);
    req.flash('error', 'Error updating reply');
    res.redirect(`/blog/${req.params.id}`);
  }
};

// Delete a comment
exports.deleteComment = async (req, res) => {
  try {
    const { id: blogId, commentId } = req.params;
    const userId = req.session.user._id;

    const blog = await Blog.findById(blogId);
    if (!blog) {
      req.flash('error', 'Blog post not found');
      return res.redirect('/blog');
    }

    const comment = blog.comments.id(commentId);
    if (!comment) {
      req.flash('error', 'Comment not found');
      return res.redirect(`/blog/${blogId}`);
    }

    // Check if user is the comment author or an admin
    if (comment.user.toString() !== userId.toString() && req.session.user.role !== 'admin') {
      req.flash('error', 'You can only delete your own comments');
      return res.redirect(`/blog/${blogId}`);
    }

    // Remove the comment
    blog.comments.pull(commentId);
    await blog.save();

    req.flash('success', 'Comment deleted successfully');
    res.redirect(`/blog/${blogId}`);
  } catch (err) {
    console.error('Error deleting comment:', err);
    req.flash('error', 'Error deleting comment');
    res.redirect(`/blog/${req.params.id}`);
  }
};

// Delete a reply
exports.deleteReply = async (req, res) => {
  try {
    const { id: blogId, commentId, replyId } = req.params;
    const userId = req.session.user._id;

    const blog = await Blog.findById(blogId);
    if (!blog) {
      req.flash('error', 'Blog post not found');
      return res.redirect('/blog');
    }

    const comment = blog.comments.id(commentId);
    if (!comment) {
      req.flash('error', 'Comment not found');
      return res.redirect(`/blog/${blogId}`);
    }

    const reply = comment.replies.id(replyId);
    if (!reply) {
      req.flash('error', 'Reply not found');
      return res.redirect(`/blog/${blogId}`);
    }

    // Check if user is the reply author or an admin
    if (reply.user.toString() !== userId.toString() && req.session.user.role !== 'admin') {
      req.flash('error', 'You can only delete your own replies');
      return res.redirect(`/blog/${blogId}`);
    }

    // Remove the reply
    comment.replies.pull(replyId);
    await blog.save();

    req.flash('success', 'Reply deleted successfully');
    res.redirect(`/blog/${blogId}`);
  } catch (err) {
    console.error('Error deleting reply:', err);
    req.flash('error', 'Error deleting reply');
    res.redirect(`/blog/${req.params.id}`);
  }
};

// Flag a blog post
exports.flagBlog = async (req, res) => {
  try {
    const blogId = req.params.id;
    const userId = req.session.user._id;

    const blog = await Blog.findById(blogId)
      .populate('author', 'username');
    
    if (!blog) {
      req.flash('error', 'Blog post not found');
      return res.redirect('/blog');
    }
    
    // Check if user has already flagged this post
    const existingFlag = blog.flags.find(flag => flag.user.toString() === userId.toString());
    if (existingFlag) {
      req.flash('error', 'You have already flagged this post');
      return res.redirect(`/blog/${blogId}`);
    }

    // Add the flag
    blog.flags.push({
      user: userId,
      reason: req.body.reason || 'Inappropriate content',
      status: 'pending',
      createdAt: new Date()
    });

    await blog.save();

    // Create notification for the blog author
    await createNotification(
      blog.author._id,
      userId,
      'flag',
      `${req.session.user.username} flagged your blog post "${blog.title}"`,
      blog._id,
      'Blog'
    );

    req.flash('success', 'Blog post has been flagged for review');
    res.redirect(`/blog/${blogId}`);
  } catch (err) {
    console.error('Error flagging blog:', err);
    req.flash('error', 'Error flagging blog post');
    res.redirect(`/blog/${req.params.id}`);
  }
};

// Get expert's draft posts
exports.getDrafts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const drafts = await Blog.find({
      author: req.session.user._id,
      status: 'draft'
    })
    .populate('author', 'username profileImage')
    .sort({ updatedAt: -1 });

    res.render('expert/blogs/index', {
      draftPosts: drafts,
      tab: 'drafts',
      user: req.session.user,
      activePage: 'blog',
      currentPage: page,
      totalPages: Math.ceil(drafts.length / limit)
    });
  } catch (err) {
    console.error('Error fetching drafts:', err);
    res.status(500).render('error', { message: 'Error fetching drafts' });
  }
};

// Get blog edit form
exports.getBlogEdit = async (req, res) => {
  try {
    const blog = await Blog.findOne({
      _id: req.params.id,
      author: req.session.user._id
    });

    if (!blog) {
      req.flash('error', 'Blog post not found or you do not have permission to edit it');
      return res.redirect('/blog/expert');
    }

    res.render('expert/blogs/edit', {
      blog,
      user: req.session.user,
      categories: [
        'Investing', 'Saving', 'Budgeting', 'Debt Management', 'Retirement Planning',
        'Taxes', 'Insurance', 'Credit & Credit Cards', 'Mortgage & Real Estate',
        'Cryptocurrency', 'Stocks & Trading', 'Personal Experience', 'Other'
      ]
    });
  } catch (err) {
    console.error('Error fetching blog for edit:', err);
    res.status(500).render('error', { message: 'Error loading blog edit form' });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    const { title, content, category, status } = req.body;
    const blog = await Blog.findOne({
      _id: req.params.id,
      author: req.session.user._id
    });

    if (!blog) {
      req.flash('error', 'Blog post not found or you do not have permission to edit it');
      return res.redirect('/blog/expert');
    }

    blog.title = title;
    blog.content = content;
    blog.category = category;
    blog.status = status || blog.status;
    blog.editedAt = new Date();
    
    // If the blog was previously published and is being saved as a draft, update the status
    if (blog.status === 'published' && status === 'draft') {
      blog.status = 'draft';
    }
    
    // If the blog is being published for the first time, set publishedAt
    if (blog.status === 'draft' && status === 'published') {
      blog.publishedAt = new Date();
    }

    await blog.save();

    req.flash('success', status === 'published' 
      ? 'Blog post published successfully!' 
      : 'Blog post saved as a draft.'
    );
    
    if (status === 'draft') {
      res.redirect('/blog/expert?tab=drafts');
    } else {
      res.redirect(`/blog/${blog._id}`);
    }
  } catch (err) {
    console.error('Error updating blog:', err);
    req.flash('error', 'Error updating blog post');
    res.redirect(`/blog/expert/edit/${req.params.id}`);
  }
};