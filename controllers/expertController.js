const User = require('../models/user');

// User Requests to Become an Expert
exports.requestExpert = async (req, res) => {
  try {
    // Check if user is authenticated
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    // Check if user is already an expert
    if (user.role === 'expert') return res.status(400).json({ message: 'You are already an expert' });
    
    // Check if user has already requested to become an expert
    if (user.expertRequestStatus === 'pending') {
      return res.status(400).json({ message: 'Your request is already under review' });
    }// If user has already requested, return 400
    
    // Update user status to pending
    user.expertRequestStatus = 'pending';
    await user.save();
    res.status(200).json({ message: 'Expert request submitted successfully' });// Return success message
  } 
    catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }// Handle any server errors
};

// Admin Approves or Rejects Expert Request
exports.approveExpert = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findById(req.params.userId);// Find the user by ID from the request parameters
    
    if (!user) return res.status(404).json({ message: 'User not found' });// If user not found, return 404

    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ message: 'Invalid status value' });
    }// If status is not valid, return 400

    user.expertRequestStatus = status;
    if (status === 'approved') user.role = 'expert';// If approved, set user role to expert
    
    await user.save();// Save the user with updated status and role
    res.status(200).json({ message: `Expert request ${status} successfully`, user });// Return success message
  } 
    catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }// Handle any server errors
};
