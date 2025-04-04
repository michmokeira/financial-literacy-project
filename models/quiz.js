const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const questionSchema = new Schema({
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: String, required: true },  // The correct answer option
});

const quizSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    questions: [questionSchema],  // Array of questions
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
