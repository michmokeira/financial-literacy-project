const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const courseSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  modules: [{ type: Schema.Types.ObjectId, ref: 'Module' }],
  finalModule: { type: Schema.Types.ObjectId, ref: 'Module' },
  duration: { type: String }
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
