const jwt = require("jsonwebtoken");

const ensureAdminAuthenticated = (req, res, next) => {
    const token = req.cookies.adminToken; // Assuming you are storing the token in a cookie
    if (!token) {
        req.flash('error_msg', 'You need to be logged in as an admin to access this page.');
        return res.redirect("/admin/signin"); // Redirect to sign-in if no token
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.adminId = decoded.id; // Attach admin ID to request
        next(); // Proceed to the next middleware/route
    } catch (error) {
        console.error("Token verification failed:", error);
        req.flash('error_msg', 'Invalid or expired token. Please sign in again.');
        return res.redirect("/admin/signin"); // Redirect on verification failure
    }
};

module.exports = ensureAdminAuthenticated;
