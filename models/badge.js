const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const badgeSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, default: '/images/badges/default-badge.png' },
  courseId: { type: Schema.Types.ObjectId, ref: 'Course' }, // The course this badge is for
  type: { 
    type: String, 
    enum: ['course-completion', 'achievement', 'expert-status'], 
    default: 'course-completion' 
  },
  criteria: { type: String, default: 'Complete the course and pass the final quiz' },
  dateCreated: { type: Date, default: Date.now },
  earnedBy: [{ 
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    dateEarned: { type: Date, default: Date.now }
  }],
  displayOnForum: { type: Boolean, default: true }
}, { timestamps: true });

// Create a unique index on badge name to prevent duplicates
badgeSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Badge', badgeSchema);