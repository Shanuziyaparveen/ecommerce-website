const express = require('express'); 
const path = require('path');
const app = express();
const session = require('express-session');
const passport = require('./config/passport');
const logger = require('morgan');
const MongoStore = require('connect-mongo'); 
const env = require('dotenv').config(); // Load environment variables from .env
const db = require('./config/db.js');
db();

// Logging middleware first
app.use(logger('dev'));

// Session setup
app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET || "arandomsecretkey",
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/bootsEcom' }),
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000
    }
}));

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

// Parsing incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);

// Routes
const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter.js');
app.use('/', userRouter);  // User routes
app.use('/admin', adminRouter);  // Admin routes

// Starting the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} http://localhost:${PORT}/`)); 

module.exports = app;
