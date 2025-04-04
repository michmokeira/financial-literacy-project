const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subtopicSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true }, // Could be URL for video or text for reading
  type: { type: String, enum: ['reading', 'video'], required: true }, // Type of content
  isCompleted: { type: Boolean, default: false }, // Track completion
  });

const Subtopic = mongoose.model('Subtopic', subtopicSchema);

module.exports = Subtopic;
