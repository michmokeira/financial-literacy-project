const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const moduleSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  subtopics: [{ type: Schema.Types.ObjectId, ref: 'Subtopic' }],
  quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' }, // Quiz related to this module
  completed: { type: Boolean, default: false }, // Whether the module is completed
  createdAt: { type: Date, default: Date.now }
});

const Module = mongoose.model('Module', moduleSchema);

module.exports = Module;
