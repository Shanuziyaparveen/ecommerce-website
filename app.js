const express = require('express'); 
const path = require('path');
const errorHandler = require('./middlewares/errorHandler'); // Adjust the path if needed
const app = express();
const session = require('express-session');
const passport = require('./config/passport');
const logger = require('morgan');
const MongoStore = require('connect-mongo'); 
const env = require('dotenv').config(); // Load environment variables from .env
const db = require('./config/db.js');
db();
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');
const methodOverride = require('method-override');

// Import session-related middleware
const userMiddleware = require('./middlewares/session/userMiddleware');
const cartMiddleware = require('./middlewares/session/cartMiddleware');

// // Logging middleware first
// app.use(logger('dev'));

app.use(cookieParser());
app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET || "arandomsecretkey",
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
        secure: false,  // Set to false for development over HTTP
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000 // 72 hours
    }
}));

// Parsing incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(methodOverride('_method')); // Looks for a `_method` parameter in POST requests

// Flash middleware
app.use(flash());

// Pass flash messages to all views
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});

// Disable caching
app.use((req, res, next) => {
    res.set('cache-control', 'no-store');
    next();
});

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

// Static file setup
app.use(express.static(path.join(__dirname, 'public')));

// Use session-related middleware
app.use(userMiddleware);
app.use(cartMiddleware);

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);

// Routes
const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter.js');
app.use('/', userRouter);  // User routes
app.use('/admin', adminRouter);  // Admin routes

app.use(errorHandler);

// Centralized Error Handler
app.use((err, req, res, next) => {
    console.error(`[${new Date().toISOString()}] ${err.stack}`); // Log error details
    res.status(err.status || 500).render('error', { 
        errorMessage: err.message || 'Internal Server Error' 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0',() => console.log(`Server running on port ${PORT} http://localhost:${PORT}/`));

module.exports = app;
