const JWT = require("jsonwebtoken");
const userModel = require("../models/userModel");

// USER AUTH MIDDLEWARE
const isAuth = async (req, res, next) => {
  // Check for token in cookies or authorization header
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];

  // Validation: No token provided
  if (!token) {
    return res.status(401).send({
      success: false,
      message: "Unauthorized User",
    });
  }

  try {
    // Verify the token
    const decodeData = JWT.verify(token, process.env.JWT_SECRET);
    req.user = await userModel.findById(decodeData._id);

    // If user not found
    if (!req.user) {
      return res.status(404).send({
        success: false,
        message: "User not found",
      });
    }

    // Proceed to the next middleware/route
    next();
  } catch (error) {
    // Handle different types of JWT errors
    if (error.name === "TokenExpiredError") {
      return res.status(401).send({
        success: false,
        message: "Token has expired",
      });
    }
    console.error("JWT Error:", error); // Log the error for debugging
    return res.status(401).send({
      success: false,
      message: "Token is invalid",
    });
  }
};

// Local Variables Middleware
function localVariables(req, res, next) {
  req.app.locals = {
    OTP: null,
    resetSession: false,
  };
  next();
}

module.exports = {
  isAuth,
  localVariables,
};
