const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CommentSchema = new Schema({
  content: { type: String, required: true },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: Schema.Types.ObjectId, ref: 'ForumPost', required: true },
  parentComment: { type: Schema.Types.ObjectId, ref: 'Comment' }, // For replies to comments
  datePosted: { type: Date, default: Date.now },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isEdited: { type: Boolean, default: false },
  lastEditedAt: { type: Date }
}, {
  timestamps: true
});

// Indexes for faster queries
CommentSchema.index({ post: 1 });
CommentSchema.index({ author: 1 });
CommentSchema.index({ datePosted: -1 });

module.exports = mongoose.model('Comment', CommentSchema);