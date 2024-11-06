
const User =require("../models/userSchema")

const setUser = async (req, res, next) => {
    if (req.session.user) {
        try {
            const user = await User.findById(req.session.user);
            res.locals.user = user; // Make the full user object available in templates
        } catch (error) {
            console.error("Error fetching user:", error);
            res.locals.user = null;
        }
    } else {
        res.locals.user = null;
    }
    next();
};
// middleware/setUser.js
module.exports = setUser;
