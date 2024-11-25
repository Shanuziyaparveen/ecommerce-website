const jwt = require("jsonwebtoken")
const User=require("../models/userSchema")

module.exports=async function (req, res, next) {
    if (!req.cookies.token) {
        console.log("No token found, redirecting to login");
        req.flash("error", "You need to login first");
        return res.redirect("/login");
      }
      
try{
    let decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
console.log("Decoded token:", decoded);

    let user=await User.findOne({email:decoded.email})
    .select("-password");
    req.user=user;
    next();
}
 catch (error) {
    console.error("JWT verification failed:", error);
    req.flash("error", "Invalid session. Please log in again.");
    return res.redirect("/login");
  }
  
}
