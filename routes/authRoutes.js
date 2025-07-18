const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Course = require('../models/course'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ensureAuthenticated } = require('../middleware/authMiddleware'); // Import authentication middleware
const roleRedirect = require('../middleware/roleRedirectMiddleware'); // Import role redirect middleware


// Render login page 
router.get('/login', (req, res) => {
    if (req.session.user){
        return res.redirect('/dashboard');// Redirect to dashboard if already logged in
    }
    res.render('login');
});

// Handle login 
router.post('/login', roleRedirect, async (req, res) => {
    console.log('Received login request:', req.body); // Debugging log

    const { email, password } = req.body;

    if (!email || !password) {
        console.log('Request body is missing email or password'); // Debugging log
        req.flash('error', 'Please enter both email and password');
        return res.redirect('/login');
    }

    try {
        const user = await User.findOne({ email });

        // Ensure user exists and password is correct
        if (!user || !bcrypt.compareSync(password, user.password)) {
            console.log('Invalid login attempt'); // Debugging log
            req.flash('error', 'Invalid credentials');
            return res.redirect('/login');
        }

        // Set session for EJS users
        req.session.user = user;
        console.log('User logged in and session set:', req.session.user); // Debugging log
        console.log('User role from database:', user.role); // Debugging user role

        // Save session before redirecting to ensure it's properly stored
        req.session.save(err => {
            if (err) {
                console.error('Session save error:', err);
                req.flash('error', 'An error occurred. Please try again.');
                return res.redirect('/login');
            }

            // Generate JWT for API use
            const token = jwt.sign(
                { id: user._id }, 
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );

            // Check if request is from Postman or frontend
            if (req.headers['content-type'] === 'application/json') {
                return res.json({ message: "Login successful", token });
            } else {
                // Redirect based on user role
                if (user.role === 'admin') {
                    return res.redirect('/admin/dashboard');
                } else if (user.role === 'expert') {
                    return res.redirect('/expert/dashboard');
                } else {
                    return res.redirect('/dashboard');
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        req.flash('error', 'An error occurred. Please try again.');
        return res.redirect('/login');
    }
});

// Render register page
router.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect('/dashboard'); // Redirect to dashboard if already logged in
    }
    res.render('register');
});

// Handle registration
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            req.flash('error', 'Email already registered');
            return res.redirect('/register'); // Redirect back to register page
        }

        // Hash password. Deleted later to avoid double hashing sisnce it is already done in the user model
        

        // Create new user
        const newUser = await User.create({ username, email, password });

        req.session.user = newUser; // Create session for the new user
        console.log('User registered and session set:', req.session.user);

        req.session.save((err) =>{
            if (err){
                console.error('Session save error:',err);
                req.flash('error','An error occured.Please try again.');
                return res.redirect('/register');//redirect back to register page
            }
        })

        console.log('User loggedin and session set:', req.session.user);// Debugging log

        req.flash('success', 'Registration successful. Redirecting to your dashboard');
        res.redirect('/dashboard'); //redirect to the dashboard after signing up


    } catch (error) {
        console.error('Error during registration:', error);
        req.flash('error', 'An error occurred. Please try again.');
        return res.redirect('/register');
    }
});

// Logout route
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/login'); // Redirect to login page after logging out
    });
});

module.exports = router;