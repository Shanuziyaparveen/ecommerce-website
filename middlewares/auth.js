const User=require("../models/userSchema");

const userAuth = (req, res, next) => {
    // Check if user is logged in by checking session
    if (req.session.user) {
        // Find user by ID
        User.findById(req.session.user)
            .then(data => {
                // Check if user exists and is not blocked
                if (data && !data.isBlocked) {
                    req.user = data;  // Attach user data to req for later use
                    return next();    // Proceed to next middleware or route handler
                } else {
                    // User is blocked or doesn't exist
                    return res.redirect("/login");
                }
            })
            .catch(error => {
                console.log("Error in user auth middleware", error);
                return res.status(500).send("Internal server error");
            });
    } else {
        // If there's no session user, redirect to login page
        return res.redirect("/login");
    }
};
const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        User.findById(req.session.admin._id)
            .then(data => {
                if (data && data.isAdmin && !data.isBlocked) {
                    req.admin = data;
                    return next();
                } else {
                    return res.redirect("/admin/login");
                }
            })
            .catch(error => {
                console.log("Error in admin auth middleware:", error);
                return res.status(500).send("Internal server error");
            });
    } else {
        return res.redirect("/admin/login");
    }
};

module.exports={
    userAuth,
    adminAuth

}