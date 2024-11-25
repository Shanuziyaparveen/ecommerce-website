const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
const env = require("dotenv").config();


passport.serializeUser((user, done) => {
    done(null, user._id);  // Store the user id in the session (not the entire user object)
});
passport.deserializeUser((id, done) => {
    User.findById(id)
        .then(user => {
            done(null, user);  // Pass the user to the session
        })
        .catch(err => {
            done(err, null);  // Pass the error if any
        });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    scope: ['profile', 'email'],
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if a user exists with the same email
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
            if (!user.googleId) {
                // If the user exists but does not have a googleId, update the record
                user.googleId = profile.id;
                await user.save();
            }
            return done(null, user);  // Pass the existing user
        } else {
            // Create a new user if none exists
            user = new User({
                name: profile.displayName,
                email: profile.emails[0].value,
                googleId: profile.id,
            });
            await user.save();
            return done(null, user);  // Pass the new user
        }
    } catch (error) {
        return done(error, null);  // Handle errors during user lookup/creation
    }
}));

module.exports = passport;
