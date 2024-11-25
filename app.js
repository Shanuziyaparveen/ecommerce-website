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
const cookieParser = require('cookie-parser');
const flash = require('connect-flash');

const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));

// // Logging middleware first
// app.use(logger('dev'));
app.use(cookieParser());
app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET || "arandomsecretkey",
    store: MongoStore.create({ mongoUrl: 'mongodb://localhost:27017/bootsEcom' }),
    cookie: {
        secure: false,  // Set to false for development over HTTP
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000 // 72 hours
    }
}));


// Parsing incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.use((req, res, next) => {
    console.log('Session user:', req.session.user);  // Check if the session user is set
    res.locals.user = req.session.user;  // Make user accessible in views
    next();
});
// Middleware to initialize cart
app.use((req, res, next) => {
    if (!req.session.cart) {
      req.session.cart = {
        items: [],
        cartTotal: 0, // Initialize with zero total
      };
    }
    next();
  });
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

// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);

// Routes
const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter.js');
app.use('/', userRouter);  // User routes
app.use('/admin', adminRouter);  // Admin routes



// // 404 Middleware for undefined routes
// app.use((req, res, next) => {
//   const error = new Error('Page Not Found');
//   error.status = 404;
//   next(error); // Forward the error to the centralized error handler
// });

// // Centralized Error Handling Middleware
// app.use((err, req, res, next) => {
//   console.error(`[${new Date().toISOString()}] ${err.stack}`); // Log the error

//   const statusCode = err.status || 500;
//   const errorMessage = err.message || 'Internal Server Error';

//   // Render the custom error page with dynamic message
//   res.status(statusCode).render('error', { 
//     errorMessage: errorMessage 
//   });
// });
// Starting the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} http://localhost:${PORT}/`)); 

module.exports = app;
