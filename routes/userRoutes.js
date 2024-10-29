const express = require('express');
const router = express.Router();
const User = require('../models/userModel'); 
const bcrypt = require('bcrypt'); // For hashing passwords
const { check, validationResult } = require('express-validator');
const { requestOTP } = require('../controllers/userController');
/** import all controllers */
const controller = require('../controllers/userController.js');
const { registerMail } = require('../controllers/mailer.js');
const { isAuth } = require('../middlewares/authMiddleware');
const { localVariables } = require('../middlewares/authMiddleware.js');



router.get('/', (req, res) => {
    const products = [
        { id: 1, name: 'Shoes', category: 'Men', price: 5000 },
        { id: 2, name: 'Shoes', category: 'Women', price: 6000 },
        { id: 3, name: 'Shoes', category: 'Women', price: 7000 },
        { id: 4, name: 'Shoes', category: 'Men', price: 5000 },
        { id: 5, name: 'Shoes', category: 'Women', price: 6000 },
        { id: 6, name: 'Shoes', category: 'Women', price: 7000 },
    ];
    
    res.render('user/home', {
        title: 'Home | Boots',
        description: 'Find Your Perfect Sole Mate',
        products
    });})
/** POST Methods */
router.post('/register', async (req, res) => {
    try {
        await controller.register(req, res);
        // No need for further response if `controller.register` handles it
    } catch (error) {
        res.render('error', { title: 'Error', error });
    }
});

router.post('/registerMail', (req, res) => {
    registerMail(req, res)
        .then(() => res.render('registerMail', { title: 'Register Mail', description: 'Email Sent Successfully' }))
        .catch(error => res.render('error', { title: 'Error', error }));
});

router.post('/authenticate', controller.verifyUser, (req, res) => {
    res.render('authenticate', { title: 'Authenticate', description: 'User Authentication' });
});

router.post('/login', controller.verifyUser, (req, res) => {
    controller.login(req, res)
        .then(() => res.render('user/login', { title: 'Login', description: 'Welcome Back!' }))
        .catch(error => res.render('user/error', { title: 'Error', error }));
});

/** GET Methods */
router.get('/user/:username', (req, res) => {
    controller.getUser(req, res)
        .then(user => res.render('user/profile', { title: 'User Profile', user }))
        .catch(error => res.render('user/error', { title: 'Error', error }));
});

router.get('/generateOTP', controller.verifyUser, localVariables, (req, res) => {
    controller.generateOTP(req, res)
        .then(otp => res.render('user/verifyOtp', { title: 'Generate OTP', otp }))
        .catch(error => res.render('user/error', { title: 'Error', error }));
});

router.get('/verifyOTP', controller.verifyUser, (req, res) => {
    controller.verifyOTP(req, res)
        .then(() => res.render('user/verifyOtp', { title: 'Verify OTP', description: 'OTP Verification Successful' }))
        .catch(error => res.render('user/error', { title: 'Error', error }));
});

// router.get('/createResetSession', (req, res) => {
//     controller.createResetSession(req, res)
//         .then(() => res.render('resetSession', { title: 'Reset Session', description: 'Session Reset Successful' }))
//         .catch(error => res.render('error', { title: 'Error', error }));
// });
router.put('/updateuser', isAuth, async (req, res) => {
    try {
        await controller.updateUser(req, res);
        res.render('user/updateUser', { title: 'Update User', description: 'User Profile Updated Successfully' });
    } catch (error) {
        res.render('user/error', { title: 'Error', error });
    }
});


// });
// const nodemailer = require('nodemailer');

// // Create a Nodemailer transporter
// const transporter = nodemailer.createTransport({
//     service: 'gmail', // Use your email provider
//     auth: {
//         user: 'your-email@gmail.com', // Your email
//         pass: 'your-email-password' // Your email password (use app password for Gmail)
//     }
// });

// // Generate a random OTP
// function generateOTP() {
//     return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
// }

// // Route to render the sign-up form
router.get('/register', (req, res) => {
    res.render('user/register', { name: '', email: '', errorMessage: undefined });
});

// // Route to handle sign-up form submission
// router.post('/register', [
//     check('name').notEmpty().withMessage('Name is required.'),
//     check('email').isEmail().withMessage('Please enter a valid email address.'),
//     check('otp').notEmpty().withMessage('OTP is required.'),
//     check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
//     check('terms').equals('on').withMessage('You must accept the terms and conditions.')
// ], async (req, res) => {
//     const errors = validationResult(req);

//     if (!errors.isEmpty()) {
//         return res.render('user/signup', { 
//             name: req.body.name, 
//             email: req.body.email, 
//             errorMessage: errors.array().map(err => err.msg).join(', ') 
//         });
//     }

//     const { name, email, otp, password } = req.body;

//     try {
//         const user = await User.findOne({ email });
//         if (!user) {
//             return res.render('user/signup', {
//                 name,
//                 email,
//                 errorMessage: 'User not found. Please request an OTP again.'
//             });
//         }

//         // Check if OTP is valid and not expired
//         if (user.otp !== otp || Date.now() > user.otpExpiration) {
//             return res.render('user/signup', {
//                 name,
//                 email,
//                 errorMessage: 'Invalid or expired OTP. Please request a new one.'
//             });
//         }

//         // Hash the password before saving
//         user.password = await bcrypt.hash(password, 10); // Ensure bcrypt is imported and set up
//         await user.save(); // Save updated user data without OTP

//         res.redirect('/login'); // Redirect to login or success page

//     } catch (error) {
//         console.error('Error during registration:', error);
//         res.render('user/signup', {
//             name,
//             email,
//             errorMessage: 'An error occurred while creating your account. Please try again.'
//         });
//     }
// });
// // Route to send OTP
// router.post('/send-otp', async (req, res) => {
//     const { email } = req.body;

//     try {
//         // Generate OTP
//         const generatedOtp = generateOTP();
//         const otpExpiration = Date.now() + 300 * 1000; // OTP valid for 5 minutes

//         // Check if user already exists
//         const existingUser = await User.findOne({ email });
//         if (existingUser) {
//             // Update existing user with new OTP
//             existingUser.otp = generatedOtp;
//             existingUser.otpExpiration = otpExpiration;
//             await existingUser.save();
//         } else {
//             // Create a new user with the OTP
//             const newUser = new User({
//                 name: '', // Placeholder, name can be updated later
//                 email,
//                 otp: generatedOtp, // Store generated OTP
//                 otpExpiration
//             });

//             await newUser.save(); // Save user to the database
//         }

//         // Send OTP via email
//         const mailOptions = {
//             from: 'your-email@gmail.com',
//             to: email,
//             subject: 'Your OTP Code',
//             text: `Your OTP code is ${generatedOtp}. It is valid for 5 minutes.`
//         };

//         transporter.sendMail(mailOptions, (error, info) => {
//             if (error) {
//                 console.error('Error sending OTP:', error);
//                 return res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
//             }
//             res.status(200).json({ message: 'OTP sent successfully!' }); // Send success response
//         });

//     } catch (error) {
//         console.error('Error during OTP sending:', error);
//         res.status(500).json({ message: 'An error occurred while sending OTP. Please try again.' });
//     }
// });


module.exports = router;  // Make sure to export the router
