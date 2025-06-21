const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  replies: [replySchema]
});

const flagSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reason: { 
    type: String, 
    enum: ['misinformation', 'irrelevant', 'inappropriate', 'spam', 'other'],
    required: true 
  },
  description: { type: String }, // Optional detailed explanation
  status: { 
    type: String, 
    enum: ['pending', 'reviewed', 'dismissed'],
    default: 'pending'
  },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewNotes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  publishedAt: { type: Date },
  status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  category: { type: String },
  tags: [{ type: String }],
  views: { type: Number, default: 0 },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  flags: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
    status: { type: String, enum: ['pending', 'resolved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
  }],
  comments: [commentSchema]
});

blogSchema.index({ title: 'text', content: 'text', tags: 'text' });

module.exports = mongoose.model('Blog', blogSchema);
