const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const replySchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  content: String,
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

const commentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  content: String,
  createdAt: { type: Date, default: Date.now },
  editedAt: { type: Date },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  replies: [replySchema]
});

const ForumPostSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  authorRole: { type: String, enum: ['learner', 'expert', 'admin'], default: 'learner' },
  datePosted: { type: Date, default: Date.now },
  lastEditedAt: { type: Date },
  category: { type: String, required: true },
  tags: [{ type: String }],
  views: { type: Number, default: 0 },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],
  isEdited: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for faster queries
ForumPostSchema.index({ title: 'text', content: 'text' });
ForumPostSchema.index({ category: 1 });
ForumPostSchema.index({ author: 1 });
ForumPostSchema.index({ datePosted: -1 });

module.exports = mongoose.model('ForumPost', ForumPostSchema);