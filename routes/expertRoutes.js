const express = require('express');
const router = express.Router();// Import the express router
const { requestExpert, approveExpert } = require('../controllers/expertController');// Import the expert controller
const { authenticate, authorizeAdmin } = require('../middleware/authMiddleware');// Import authentication and authorization middleware

router.post('/request-expert', authenticate, requestExpert);// Route for users to request to become an expert
router.put('/approve-expert/:userId', authenticate, authorizeAdmin, approveExpert);// Route for admin to approve or reject expert requests

module.exports = router;
