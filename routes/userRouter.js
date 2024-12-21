const express = require('express');
const router = express.Router();
const passport=require("passport")
const userController = require("../controllers/user/userController")
const profileController =require("../controllers/user/profileController")
const productController =require("../controllers/user/productController")
const orderController = require("../controllers/user/orderController")
const {userAuth,adminAuth}=require("../middlewares/auth");
const isLoggedin=require("../middlewares/isLoggedin");
const Product = require('../models/productSchema');
const wishlistController=require("../controllers/user/wishlistController")




// Load the homepage
router.get('/', userController.loadHomepage);

// Shopping and product routes
router.get('/shop', userAuth, productController.loadShoppingPage);
router.get('/filter', userAuth, productController.filterProduct);
router.get('/filterByPrice', userAuth, productController.filterByPrice);
router.post('/search', userAuth, productController.searchProducts);
router.get('/filtersort', userAuth, productController.filterSort);
router.post('/categorySort', userAuth, productController.getCategorySort);

// Error handling route
router.get('/pageNotFound', userController.pageNotFound);

// User authentication and signup routes
router.get('/signup', userController.loadSignup);
router.post('/signup', userController.signup);
router.post('/verify-otp', userController.verifyOtp);
router.post('/resend-otp', userController.resendOtp);


router.get("/auth/google",passport.authenticate('google',{scope:['profile','email']}))

router.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/' }),  // Redirect if login fails
    (req, res) => {
        console.log('User after Google OAuth:', req.user);  // Log user info after OAuth
           // Save the user object in the session
           req.session.user = req.user;
           console.log('Session user after setting:', req.session.user);  // Should display the user object
   
        res.redirect('/');  // Redirect to the homepage or dashboard
    }
);
// Product routes
router.get('/getAllProducts', productController.getAllProducts);
router.get('/product/:id', productController.getProductDetails);
router.get('/productDetails', userAuth, productController.productDetails);

// User authentication routes
router.get('/login', userController.loadLogin);
router.post('/login', userController.login);
router.get('/logout', userController.logout);

// Forgot password routes
router.get('/forgot-password', profileController.getForgotPassPage);
router.post('/forgot-email-valid', profileController.forgotEmailValid);
router.post('/verify-passForgot-otp', profileController.verifyForgotPassOtp);
router.get('/reset-password', profileController.getResetPassPage);
router.post('/resend-forgot-otp', profileController.resendOtp);
router.post('/reset-password', profileController.postNewPassword);

// User profile routes
router.get('/userProfile', userAuth, profileController.userProfile);
router.get('/change-email', userAuth, profileController.changeEmail);
router.post('/change-email', userAuth, profileController.changeEmailValid);
router.post('/verify-email-otp', userAuth, profileController.verifyEmailOtp);
router.post('/update-email', userAuth, profileController.updateEmail);
router.get('/change-password', userAuth, profileController.changePassword);
router.post('/change-password', userAuth, profileController.changePasswordValid);
router.post('/verify-changepassword-otp', userAuth, profileController.verifyChangePassOtp);

// Address management routes
router.get('/addAddress', userAuth, profileController.addAddress);
router.post('/addAddress', userAuth, profileController.postAddAddress);
router.get('/editAddress', userAuth, profileController.editAddress);
router.post('/editAddress', userAuth, profileController.postEditAddress);
router.get('/deleteAddress', userAuth, profileController.deleteAddress);

// Cart routes
router.post('/addToCart', userAuth, productController.addToCart);
router.get('/cart', userAuth, productController.getCartPage);
router.post('/cart/update', userAuth, productController.updateCart);
router.post('/removeFromCart', userAuth, productController.removeFromCart);
// Checkout routes
router.get('/checkout', productController.getCheckout);
router.post('/checkout/select-address', productController.selectAddress);
router.post('/checkout/save-address', productController.saveAddress);

// Payment routes
router.get('/payment', userAuth, orderController.getPaymentPage);
router.post('/process-payment', userAuth, orderController.processPayment);
router.post('/confirm-order', userAuth, orderController.confirmOrder);
router.get('/confirm-order', userAuth, orderController.getconfirmOrder);
router.post('/payment-success',userAuth, orderController.postSuccess);
// Order management routes
router.get('/viewOrder/:id', userAuth, orderController.viewOrder);
router.get('/cancelOrder', userAuth, orderController.cancelOrder);
router.get('/cancel-product/:id', userAuth, orderController.cancelSpecificItem);
router.post('/returnOrder', userAuth, orderController.returnOrder);
router.get('/payment-failed', orderController.handleFailedPayment);
router.post('/payment/retry', orderController.retryPayment);

// Wishlist routes
router.get('/wishList', wishlistController.getwishList);
router.post('/addTowishList', wishlistController.addTowishList);
router.post('/deleteProduct/:id', wishlistController.getRemoveFromWishlist);
router.post('/couponApply', orderController.couponApply);

// Wallet routes
router.post('/wallet/add-money', userController.addMoney);
router.post('/cart/select-wallet', userController.selectWallet);

// Confirm checkout route
router.get('/confirm-checkout', orderController.confirmCheckout);

// Return single product route
router.post('/return-product/:productId', orderController.returnSingleProduct);


// Routes for footer pages
router.get('/contact', userController.getContactPage);
router.get('/payment-methods', userController.getPaymentMethodsPage);
router.get('/delivery', userController.getDeliveryPage);
router.get('/returns-and-exchanges', userController.getReturnsAndExchangesPage);

module.exports = router;  
