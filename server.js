require("dotenv").config();// Load environment variables from .env file

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bcryptjs = require("bcryptjs");
const flash = require("connect-flash");


const app = express();

//LOAD ENVIRONMENT VARIABLES
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/financial_literacy_db';
const JWT_SECRET = process.env.JWT_SECRET||'thisisaverysecretkeythatineedtochangetomakeitmoresecure';


//middleware
app.use(express.static("public"));// Serve static files from the "public" directory
app.use(express.json());// Parse JSON data in request bodies
app.set("view engine", "ejs"); // Set EJS as the view engine


//session middleware
app.use(session({
  secret: process.env.JWT_SECRET,// Secret key for signing the session ID cookie
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
mongoose.connect('mongodb://localhost:27017/financial_literacy_db')
  .then(() => console.log("Connected to MongoDB"))
  .catch(err => console.error('MongoDB Connection Error:', err));// Log connection errors

//routes
const authRoutes = require('./routes/authRoutes');// Import authentication routes
const dashboardRoutes = require('./routes/dashboardRoutes');// Import dashboard routes
const expertRoutes = require('./routes/expertRoutes');// Import expert routes
const courseRoutes = require('./routes/courseRoutes'); //Import course routes

// Use the imported routes
app.use('/', authRoutes);// Use authentication routes for the root path
app.use('/dashboard', dashboardRoutes);// Use dashboard routes for the "/dashboard" path
app.use('/expert', expertRoutes);// Use expert routes for the "/expert" path
app.use('/courses', courseRoutes);//Use course routes for the "/courses" path

//default route
app.get("/", (req, res) => {
  res.send("Welcome to the Financial Literacy Platform!");
});

// 404 Error Handling (For undefined routes)
app.use((req, res) => {
  res.status(404).send("404 Not Found: The page you are looking for does not exist.");
});


//start over
app.listen(3000, () => {
  console.log("Server started on port 3000");
});
