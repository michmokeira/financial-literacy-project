const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username:{ type :String, required: true },
  email:{ type :String, required: true, unique: true },
  password:{ type :String, required: true },
  role:{type: String, enum: ['learner', 'expert', 'admin'], default: 'learner'},
  completedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],// Array of completed course IDs
  enrolledCourses: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    currentModule: { type: mongoose.Schema.Types.ObjectId, ref: 'Module' }, // Track current module
    completedSubtopics: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subtopic' }], // Track completed subtopics
    completedQuiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }, // Track completed quiz
    progress: { type: Number, default: 0 } // Overall course progress (0-100)
  }],
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],// Array of badge IDs
  forumPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost' }],// Array of forum post IDs
  expertRequestStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },// Status of expert request
  invitedAsExpert: { type: Boolean, default: false },// Flag for expert invitation, true if admin invites the user as an expert
  expertInvitationStatus: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },// Status of expert invitation
});

module.exports = mongoose.model('User', UserSchema);

//pre-save hook to hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next(); // If password is not modified, skip hashing
  try{
    const salt = await bcrypt.genSalt(10); // Generate a salt
    this.password = await bcrypt.hash(this.password, salt);
    next(); // Proceed to save the user
  }catch(err){
  next(err);
  // Handle error during password hashing
  }
});

const User = mongoose.model('User', UserSchema);
module.exports = User;
