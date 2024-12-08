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

router.get('/', userController.loadHomepage);
router.get("/shop",userAuth,userController.loadShoppingPage);
router.get("/filter",userAuth,userController.filterProduct);
router.get("/filterByPrice",userAuth,userController.filterByPrice);
router.post("/search",userAuth,userController.searchProducts)
router.get("/filtersort",userAuth,userController.filterSort)
router.post('/categorySort', userAuth,userController.getCategorySort)

router.get('/pageNotFound',userController.pageNotFound)

router.get('/signup', userController.loadSignup);
router.post("/signup",userController.signup)
router.post("/verify-otp",userController.verifyOtp)
router.post("/resend-otp",userController.resendOtp)

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
router.get("/getAllProducts",userController.getAllProducts)
 router.get('/product/:id', userController.getProductDetails);
 router.get("/productDetails",userAuth,productController.productDetails)
router.get("/login",userController.loadLogin)
router.post("/login",userController.login)
router.get("/logout",userController.logout)
router.get("/forgot-password",profileController.getForgotPassPage);
router.post("/forgot-email-valid",profileController.forgotEmailValid);
router.post("/verify-passForgot-otp",profileController.verifyForgotPassOtp)
router.get("/reset-password",profileController.getResetPassPage)
router.post("/resend-forgot-otp",profileController.resendOtp)
router.post("/reset-password",profileController.postNewPassword)
router.get("/userProfile",userAuth,profileController.userProfile);
router.get("/change-email",userAuth,profileController.changeEmail)
router.post("/change-email",userAuth,profileController.changeEmailValid)
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp)
router.post("/update-email",userAuth,profileController.updateEmail)
router.get("/change-password",userAuth,profileController.changePassword)
router.post("/change-password",userAuth,profileController.changePasswordValid)
router.post("/verify-changepassword-otp",userAuth,profileController.verifyChangePassOtp)
// address management

router.get("/addAddress",userAuth,profileController.addAddress)
 router.post("/addAddress",userAuth,profileController.postAddAddress)
 router.get("/editAddress",userAuth,profileController.editAddress)
 router.post("/editAddress",userAuth,profileController.postEditAddress)
 router.get("/deleteAddress",userAuth,profileController.deleteAddress)

// addtocart

router.post("/addToCart", userAuth, productController.addToCart);
router.get("/cart", userAuth, productController.getCartPage);
// Routes for increment and decrement actions
router.post('/cart/increment', userAuth, productController.incrementQuantity);
router.post('/cart/decrement', userAuth, productController.decrementQuantity);

router.post('/removeFromCart', userAuth, productController.removeFromCart);

// Route to get the checkout page
router.get('/checkout', productController.getCheckout);

// Route to handle the selection of an address
router.post('/checkout/select-address', productController.selectAddress);

// Route to handle adding or editing an address
router.post('/checkout/save-address', productController.saveAddress);


router.get('/payment',userAuth, orderController.getPaymentPage);

router.post("/process-payment",userAuth, orderController.processPayment);

router.post("/confirm-order", userAuth, orderController.confirmOrder);
router.get("/confirm-order", userAuth, orderController.getconfirmOrder);

router.get('/viewOrder/:id',userAuth,orderController.viewOrder);
router.get('/cancelOrder',userAuth,orderController.cancelOrder);

router.get('/cancel-product/:id', userAuth, orderController.cancelSpecificItem);
router.post('/returnOrder',userAuth, orderController.returnOrder);

//wishlist

router.get('/wishList', wishlistController.getwishList)
router.post('/addTowishList', wishlistController.addTowishList)
router.post('/deleteProduct/:id',wishlistController.getRemoveFromWishlist)
router.post('/couponApply',orderController.couponApply)


//wallet

router.post('/wallet/add-money', userController.addMoney);
router.post('/cart/select-wallet',userController.selectWallet);

//confirmcheckout
router.get('/confirm-checkout', orderController.confirmCheckout);

//return single product 

router.post('/return-product/:productId',orderController.returnSingleProduct)

module.exports = router;  // Make sure to export the router
