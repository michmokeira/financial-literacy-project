const User = require('../models/user');
const bcrypt = require('bcryptjs');// Import bcrypt for password hashing
const jwt = require('jsonwebtoken');// Import JWT for token generation

exports.registerUser = async (req, res) => {
  try{
    const {username, email,password} = req.body;// Destructure the request body to get username, email, and password
    
    // Check if a user with the same email already exists in the database
    const existingUser = await User.findOne({email});
    if(existingUser) return res.status(400).json({message: 'User already exists'});
    //if exist, send error message

    //hash password before saving
    const salt = await bcrypt.genSalt(10);// Generate a salt for password hashing
    const hashedPassword = await bcrypt.hash(password, salt);// Hash the password using the generated salt

    // Create a new user w/ the hashed password
    const newUser = new User({
      username,
      email,
      password:hashedPassword,
    });

    await newUser.save();// Save the new user to the database
    res.status(201).json({message: 'User registered successfully'});// Send a 201 response with a success message
  }
  catch(error){
      res.status(500).json({message: 'Server error',error:error.message});// Send a 500 response with an error message
    }  
  };

//user login
  exports.loginUser = async(req, res) =>{
    try{
      const {email, password} = req.body;

      //Check if user exists
      const user = await User.findOne({email});
      if(!user) return res.status(400).json({message: 'User not found'});// If user not found, send error message

      //check passwords
      const isMatch = await bcrypt.compare(password, user.password);//Compare the provided password with the hashed password in the database
      if(!isMatch) return res.status(400).json({message: 'Wrong username or password'});// If passwords do not match, send error message

      // Generate JWT token
      const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '1h'});// Generate a JWT token with the user's ID and a secret key
      res.status(200).json({message: 'Login successful', token});// Send a 200 response with the token
    }
    catch(error){
      res.status(500).json({message: 'Server error', error:error.message});// Send a 500 response with an error message
    }
  };