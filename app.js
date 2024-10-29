const express = require('express'); 
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const flash = require('connect-flash');
const expressSession = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const createError = require('http-errors');
const Admin = require('./models/adminModel'); // Import your Admin model
const db = require('./config/db.js');
const env = require('dotenv').config(); // Load environment variables from .env
const methodOverride = require('method-override');
const app = express();
app.use(methodOverride('_method'));


db();

// View Engine Setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Session Middleware
app.use(expressSession({
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET || "arandomsecretkey",
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 3600000 // 1 hour
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// Define passport serialization and deserialization
passport.serializeUser((admin, done) => {
    done(null, admin.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const admin = await Admin.findById(id);
        done(null, admin);
    } catch (err) {
        done(err);
    }
});
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Local Strategy for Admin Login
passport.use('admin-local', new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password'
}, async (username, password, done) => {
    try {
        const admin = await Admin.findOne({ username });
        
        if (!admin || admin.isBlocked) {
            return done(null, false, { message: 'Incorrect username or admin is blocked.' });
        }

        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return done(null, false, { message: 'Incorrect password.' });
        }

        return done(null, admin);
    } catch (err) {
        return done(err);
    }
}));

// Middleware
app.use(flash());
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/user', express.static(path.join(__dirname, 'public/user')));
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/', userRoutes);       // User routes
app.use('/admin', adminRoutes); // Admin routes

// 404 Error Handler
app.use((req, res, next) => {
    res.status(404).send('404 Not Found');
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).send('Something went wrong!');
});

// Starting the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} http://localhost:${PORT}/`)); 

module.exports=app;