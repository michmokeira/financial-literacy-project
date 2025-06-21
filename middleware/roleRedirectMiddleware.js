// Middleware to redirect users based on their role
function roleRedirect(req, res, next) {
    if (req.session.user) {
        console.log(`User role identified: ${req.session.user.role}`); // Debugging user role
        if (req.session.user.role === 'expert') {
            // Redirect experts to their dashboard or views
            return res.redirect('/expert/dashboard');
        } else if (req.session.user.role === 'learner') {
            // Redirect learners to their dashboard or views
            return res.redirect('/dashboard');
        }
    }
    next(); // Proceed if no user is logged in or no redirection is needed
}

module.exports = roleRedirect;
