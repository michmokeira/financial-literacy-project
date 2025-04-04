const mongoose = require('mongoose');
const Course = require('../models/course'); 

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/financial_literacy_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Define test courses
const courses = [
  {
    title: 'Introduction to Saving',
    description: 'Learn how to start saving money effectively.'
  },
  {
    title: 'Budgeting 101',
    description: 'Build your first budget and stick to it.'
  },
  {
    title: 'Credit & Loans',
    description: 'Understand how credit works and how to use loans responsibly.'
  }
];

// Insert the courses into the database
Course.insertMany(courses)
  .then(() => {
    console.log('✅ Sample courses added successfully!');
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('❌ Error inserting courses:', err);
    mongoose.connection.close();
  });
