const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Course = require('../models/course');
const Module = require('../models/module');
const Subtopic = require('../models/subtopic');
const Quiz = require('../models/quiz'); 


// Display all courses
router.get('/', async (req, res) => {
  try {
    const courses = await Course.find();
    res.render('course', { courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    req.flash('error', 'An error occurred. Please try again later.');
    res.redirect('/dashboard');
  }
});


//view available courses
router.get('/courses', (req,res)=>{
  res.render('courseList',{
    courses: courses
  });
});

//Diplay course Details
router.get('/courses/:courseId', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const course = await Course.findById(req.params.courseId).populate({
      path: 'modules',
      populate: { path: 'subtopics quizzes' }, //Populate subtopic & quizzes
    });

    if (!course) {
      req.flash('error', 'Course not found');
      return res.redirect('/courses');
    }

    // Check if the user is enrolled in the course
    const user = await User.findById(userId);
    const enrolledCourse = user.enrolledCourses.find(enrolled => enrolled.course.toString() === course._id.toString());

    // Render the course details page and pass the course data and enrollment status
    res.render('courseDetail', { course, enrolledCourse });
  } catch (error) {
    console.error('Error fetching course details:', error);
    req.flash('error', 'An error occurred. Please try again later.');
    res.redirect('/courses');
  }
});

// Enroll in a course
router.post('/enroll/:courseId', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const course = await Course.findById(req.params.courseId).populate('modules');

    if (!course) {
      req.flash('error', 'Course not found');
      return res.redirect('/courses');
    }

    // Check if the user is already enrolled
    const user = await User.findById(userId);
    if (user.enrolledCourses.some(enrolledCourse => enrolledCourse.course.toString() === course._id.toString())) {
      req.flash('error', 'You are already enrolled in this course');
      return res.redirect(`/courses/${course._id}`);
    }

    // Set initial progress and modules
    const enrolledCourse = {
      course: course._id,
      currentModule: course.modules[0],
      completedSubtopics: [],
      completedQuiz: null,
      progress: 0
    };

    // Enroll user
    user.enrolledCourses.push(enrolledCourse);
    await user.save();

    req.flash('success', 'Successfully enrolled in the course');
    res.redirect(`/courses/${course._id}`);
  } catch (error) {
    console.error('Enrollment error:', error);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/courses');
  }
});

// Mark subtopic as completed
router.post('/complete-subtopic/:subtopicId', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const subtopicId = req.params.subtopicId;
    
    // Find the user's enrolled course
    const user = await User.findById(userId);
    const enrolledCourse = user.enrolledCourses.find(enrolled => enrolled.course.toString() === req.body.courseId);
    
    if (!enrolledCourse) {
      req.flash('error', 'You are not enrolled in this course');
      return res.redirect('/dashboard');
    }

    if (enrolledCourse.completedSubtopics.includes(subtopicId)) {
      req.flash('info', 'This subtopic is already marked as completed');
      return res.redirect(`/courses/${enrolledCourse.course}`);
    }

    // Find the subtopic
    const subtopic = await Subtopic.findById(subtopicId);
    if (!subtopic) {
      req.flash('error', 'Subtopic not found');
      return res.redirect('/dashboard');
    }

    // Mark subtopic as completed
    enrolledCourse.completedSubtopics.push(subtopic._id);

    // Fetch the course and populate modules & subtopics
    const course = await Course.findById(enrolledCourse.course).populate({
      path: 'modules',
      populate: { path: 'subtopics' }
    });

    if (!course) {
      req.flash('error', 'Course not found');
      return res.redirect('/dashboard');
    }

    // Get total number of subtopics in the course
    const totalSubtopics = course.modules.reduce((total, module) => total + module.subtopics.length, 0);

    // Update progress
    const completedSubtopicsCount = enrolledCourse.completedSubtopics.length;
    enrolledCourse.progress = totalSubtopics > 0 ? 
      Math.round((enrolledCourse.completedSubtopics.length / totalSubtopics) * 100) : 
      0;

    if (typeof enrolledCourse.progress !== 'number'||isNaN(enrolledCourse.progress)){
      enrolledCourse.progress = 0;
    }
    await user.save();

    req.flash('success', 'Subtopic marked as completed');
    res.redirect(`/courses/${enrolledCourse.course}`);
  } catch (error) {
    console.error('Error marking subtopic as completed:', error);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});

// Mark quiz as completed
router.post('/complete-quiz/:quizId', async (req, res) => {
  try {
    const userId = req.session.user._id;
    const quizId = req.params.quizId;
    
    // Find the user's enrolled course
    const user = await User.findById(userId);
    const enrolledCourse = user.enrolledCourses.find(enrolled => enrolled.course.toString() === req.body.courseId);
    
    if (!enrolledCourse) {
      req.flash('error', 'You are not enrolled in this course');
      return res.redirect('/dashboard');
    }

    // Find the quiz
    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      req.flash('error', 'Quiz not found');
      return res.redirect(`/courses/${enrolledCourse.course}`);
    }

    // Mark quiz as completed
    enrolledCourse.completedQuiz = quiz._id;

    await user.save();

    req.flash('success', 'Quiz completed');
    res.redirect(`/courses/${enrolledCourse.course}`);
  } catch (error) {
    console.error('Error marking quiz as completed:', error);
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/dashboard');
  }
});

module.exports = router;
