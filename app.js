const express = require('express'); 
const path = require('path');
const app = express();
const env = require('dotenv').config(); // Load environment variables from .env
const db = require('./config/db.js');

// Routes
const userRouter = require('./routes/userRouter');
// const adminRouter = require('./routes/adminRouter.js');


db();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// View Engine Setup
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views/user'),path.join(__dirname, 'views/admin')]);

app.use( express.static(path.join(__dirname, 'public')));
app.use('/', userRouter);       // User routes


// // Session Middleware
// app.use(expressSession({
//     resave: false,
//     saveUninitialized: false,
//     secret: process.env.SESSION_SECRET || "arandomsecretkey",
//     cookie: {
//         secure: process.env.NODE_ENV === 'production', // Set to true if using HTTPS
//         httpOnly: true,
//         maxAge: 3600000 // 1 hour
//     }
// }));

// // Middleware
// app.use(flash());
// app.use((req, res, next) => {
//     res.locals.success_msg = req.flash('success_msg');
//     res.locals.error_msg = req.flash('error_msg');
//     res.locals.error = req.flash('error');
//     next();
// });

// app.use(logger('dev'));

// app.use(cookieParser());


// app.use('/admin', adminRouter); // Admin routes

// // 404 Error Handler
// app.use((req, res, next) => {
//     res.status(404).send('404 Not Found');
// });

// // Centralized Error Handling Middleware
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(err.status || 500).send('Something went wrong!');
// });

// Starting the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} http://localhost:${PORT}/`)); 

module.exports=app;