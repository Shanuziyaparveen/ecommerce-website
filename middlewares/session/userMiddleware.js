// Middleware to set session user in views
const userMiddleware = (req, res, next) => {
    console.log('Session user:', req.session.user);  // Check if the session user is set
    res.locals.user = req.session.user;  // Make user accessible in views
    next();
};

module.exports = userMiddleware;
