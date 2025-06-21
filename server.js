require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bcryptjs = require("bcryptjs");
const flash = require("connect-flash");
const path = require("path");
const Notification = require('./models/notification');

const app = express();

//middleware
app.use(express.static("public"));// Serve static files from the "public" directory

// Debug logging for static files
app.use((req, res, next) => {
  if (req.path.endsWith('.css')) {
    console.log('CSS Request:', req.path);
  }
  next();
});

app.use(express.json());// Parse JSON data in request bodies
app.set("view engine", "ejs"); // Set EJS as the view engine

// Completely disable caching for all static files
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

//session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,// Secret key for signing the session ID cookie
  resave: false,// Do not save session if unmodified
  saveUninitialized: true,// Save uninitialized sessions
  cookie: {
    secure: false,//Set to true if using HTTPS (for production)
    httpOnly: true,//Prevent client-side JavaScript from accessing the cookie
    maxAge: 3600000//Set cookie expiration time (1 hour)
   }// Set secure to true if using HTTPS
  }));

//flash messages middleware
app.use(flash());// Initialize flash messages

app.use(express.urlencoded({ extended: true }));// Parse URL-encoded bodies

//middleware for storing user data in session
app.use((req, res, next) =>{
  res.locals.user = req.session.user||null;// Store user data in res.locals for use in views
  res.locals.message = req.flash();// Store flash messages in res.locals
  next();// Call the next middleware function
})

//Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error('MongoDB Connection Error:', err));// Log connection errors

//routes
const authRoutes = require('./routes/authRoutes');// Import authentication routes
const dashboardRoutes = require('./routes/dashboardRoutes');// Import dashboard routes
const expertRoutes = require('./routes/expertRoutes');// Import expert routes
const courseRoutes = require('./routes/courseRoutes'); //Import course routes
const profileRoutes = require('./routes/profileRoutes');// Import profile routes
const forumRoutes = require('./routes/forumRoutes');// Import forum routes
const notificationRoutes = require('./routes/notificationRoutes');// Import notification routes
// const adminRoutes = require('./routes/adminRoutes');// Import admin routes
const blogRoutes = require('./routes/blogRoutes');// Import blog routes


// Use the imported routes
app.use('/', authRoutes);// Use authentication routes for the root path
app.use('/dashboard', dashboardRoutes);// Use dashboard routes for the "/dashboard" path
app.use('/expert', expertRoutes);// Use expert routes for the "/expert" path
app.use('/courses', courseRoutes);//Use course routes for the "/courses" path
app.use('/profile', profileRoutes);// Use profile routes for the "/profile" path
app.use('/forum', forumRoutes);// Use forum routes for the "/forum" path
app.use('/notifications', notificationRoutes);// Use notification routes for the "/notifications" path
// app.use('/admin', adminRoutes);// Use admin routes for the "/admin" path
app.use('/blog', blogRoutes);// Use blog routes for the "/blog" path



//default route
app.get("/", (req, res) => {
  res.send("Welcome to the Financial Literacy Platform!");
});

// 404 Error Handling (For undefined routes)
app.use((req, res) => {
  res.status(404).send("404 Not Found: The page you are looking for does not exist.");
});

//start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
