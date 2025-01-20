const User =require("../../models/userSchema")
const nodemailer = require("nodemailer")
const env=require("dotenv").config();
const Banner=require("../../models/bannerSchema")
const bcrypt=require("bcrypt")
const Product=require("../../models/productSchema")
const path = require('path');
const Category=require("../../models/categorySchema");
const Brand=require("../../models/brandSchema")
const mongoose = require('mongoose');

const { generateReferralCode } = require('../../utils/cryptoUtils');



const loadHomepage = async (req, res,next ) => {
    try {
        const today=new Date().toISOString();
        const findBanner= await Banner.find({
            startDate: {$lte: new Date(today)},
            endDate: {$gte: new Date(today)},
        })
        const user = req.session.user; // This should be an object now
        let wishlist = [];
if (user) {
  wishlist = user.wishlist; // Get the user's wishlist
}
        // console.log("Session user:", user); // Log the entire user object
        const categories=await Category.find({isListed: true})
        let productData = await Product.find({isBlocked: false,
             quantity:{$gt:0}})
            productData.sort((a,b)=>new Date(a.createdOn)-new Date(b.createdOn))
           productData = productData.slice(0,7);
        
    
           if (user) {
            // Check if the user is blocked
            const userData = await User.findById(user._id);
            if (userData && userData.isBlocked) {
                // If the user is blocked, destroy the session and redirect to login
                req.session.destroy((err) => {
                    if (err) {
                        console.log("Error while destroying session", err);
                        return res.redirect("/pageNotFound");
                    }
                    return res.redirect("/login");
                });
            } else {
                // If the user is not blocked, render the homepage
                return res.render('home', { user: userData, products: productData, banner: findBanner || [] });
            }
        } else {
            // If no user is logged in, render the homepage without user data
            return res.render('home', { products: productData, banner: findBanner || [] });
        }
    }  catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
};

const pageNotFound = async (req, res,next) => {
    try {
        // Passing the statusCode (404) to the EJS template
        res.status(404).render("page-404", { statusCode: 404 });
    }   catch (error) {
        // Enhance and forward the error
        error.status = error.status || 500;
        next(error);
    }
};

const loadSignup=async(req,res,next)=>{
    try{
        res.render("signup")
    }  catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}
const loadShopping=async(req,res,next)=>{
    try{
        res.render("shop")
    }   catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}
function generateOtp(){
    return Math.floor(100000 +Math.random()*900000).toString();
}
async function sendVerificationEmail(email,otp){
    try {
        const transporter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD

            }
        })

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is: ${otp}`,
            html:`<b>Your OTP is: ${otp}</b>`
        })
        return info.accepted.length>0
    }   catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}
const signup = async (req, res, next) => {
    try {
        const { name, phone, email, password, cPassword, referralCode } = req.body;

        // Check if all required fields are provided
        if (!name || !phone || !email || !password || !cPassword) {
            return res.render("signup", { message: "All fields are required" });
        }

        // Check if passwords match
        if (password !== cPassword) {
            return res.render("signup", { message: "Passwords do not match" });
        }

        // Check if a user already exists with the given email
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User with this email already exists" });
        }

        const newReferralCode = generateReferralCode();

        // Check if a referral code was provided and if it is valid
        let referredBy = null;
        if (referralCode) {
            const referringUser = await User.findOne({ referralCode: referralCode });
            if (referringUser) {
                referredBy = referringUser.referralCode; // Store the referral code of the user who referred them
            } else {
                return res.render("signup", { message: "Invalid referral code" });
            }
        }

        // Generate OTP and send verification email
        const otp = generateOtp();
        const emailSend = await sendVerificationEmail(email, otp);
        if (!emailSend) {
            return res.render("signup", { message: "Failed to send verification email. Please try again." });
        }

        // Store OTP and user data in session
        req.session.userOtp = otp;
        req.session.userData = {
            name,
            phone,
            email,
            password,
            referralCode: newReferralCode,
            referredBy,
        };

        res.render("verify-otp");
        console.log("OTP sent", otp);
    } catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
};

const securePassword=async(password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash;
    }   catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}
const verifyOtp=async (req,res,next )=>{
    try {
        const {otp}=req.body;
        console.log(otp);
        if (otp===req.session.userOtp){
            const user=req.session.userData
            const passwordHash = await securePassword(user.password)
            const saveUserData= new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash,
                referralCode: user.referralCode,
                referredBy: user.referredBy,
            })
            await saveUserData.save();

             // Reward the referrer if the user was referred by someone
if (user.referredBy) {
    const referrer = await User.findOne({ referralCode: user.referredBy });
    if (referrer) {
        const rewardAmount = 200; // Example reward points or currency value

        // Add reward to the referrer's wallet
        referrer.wallet = (referrer.wallet || 0) + rewardAmount;

        // Add reward to the referrer's rewards
        referrer.rewards = (referrer.rewards || 0) + rewardAmount;

        // Log the transaction in the referrer's transaction history
        referrer.transactions.push({
            amount: rewardAmount,
            type: 'Referral Reward',
            description: `Reward for referring user: ${user._id}`,
            status: 'Completed',
        });

        // Save the referrer's updated details
        await referrer.save();
    }
}

// Reward the new user
const newUserReward = 100; // Example reward points for the new user

// Add reward to the new user's wallet
saveUserData.wallet = (saveUserData.wallet || 0) + newUserReward;

// Add reward to the new user's rewards
saveUserData.rewards = (saveUserData.rewards || 0) + newUserReward;

// Log the transaction in the new user's transaction history
saveUserData.transactions.push({
    amount: newUserReward,
    type: 'Welcome Reward',
    description: 'Reward for signing up or being referred.',
    status: 'Completed',
});

// Save the updated new user data
await saveUserData.save();

            // Destroy the session after successful signup
            req.session.destroy((err) => {
                if (err) {
                    console.error("Error destroying session:", err);
                    return res.status(500).json({ success: false, message: "Error completing signup. Please try again." });
                }
                res.json({ success: true, redirectUrl: "/login" }); // Redirect to login
            });
        }else{
            res.status(400).json({success:false,message:"Invalid OTP,please try again"})
        }
        
    }   catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}

const resendOtp=async(req,res,next)=>{
    try {
        const {email}=req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }
        const otp = generateOtp();
        req.session.userOtp=otp;
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP",otp);
            res.status(200).json({success:true,message:"OTP Resend Succesfully"})

            
        }else{
            res.status(500).json({success:false,message:"Failed to Resend OTP, please try again"})
        }
    }  catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}
const loadLogin = async (req,res,next)=>{
    try {
        if(!req.session.user){
            return res.render("login",{loggedin:false})
        }else{
            res.redirect("/")
        }
    }  catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }

}
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: 0, email: email });
        
        if (!findUser) {
            return res.render("login", { message: "User not found",loggedin:false});
        }

        if (findUser.isBlocked) {
            return res.render("login", { message: "User is blocked by admin" ,loggedin:false});
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect password" ,loggedin:false});
        }

       // Store user details in session
req.session.user = {
    _id: findUser._id,
    name: findUser.name,   // add fields you need
    email: findUser.email  // add fields you need
};

        // Store user data in res.locals for use in views
        res.locals.user = findUser;

        // Redirect to home page
        res.redirect("/");
    }   catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}

const logout=  async(req,res,next)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("session destruction error",err.message);
                return res.redirect("/pageNotFound")
            }
            return res.redirect("/login")
        })
    }    catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}

const addMoney = async (req, res) => {
    try {
      const userId = req.session.user;
      const { amount } = req.body;
  
      // Find the user by ID
      const user = await User.findById(userId);
      
      // Update the user's wallet balance
      user.wallet += parseFloat(amount);
      
      // Adds a new transaction entry with status 'Pending'
      user.transactions.push({
        amount: parseFloat(amount),
        type: 'Payment', // Type of the transaction
        date: new Date(), // Date of transaction
        orderId: null, // No associated order for wallet top-up
        status: 'Active', 
      });
  
      // Save the updated user data
      await user.save();
  
      res.redirect('/userProfile'); // Redirect to the profile page after updating the wallet
    }  catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
  };
  const selectWallet = async (req, res) => {
    try {
        const { paymentMethod } = req.body;

        // Check if the selected payment method is 'wallet'
        if (paymentMethod === 'wallet') {
            // Store this in the session so we know the wallet was applied
            req.session.applyWallet = true;

            // Fetch user details including wallet balance
            const user = req.session.user;
            const userId = user._id;
            const userDetails = await User.findById(userId).select('wallet');
            const walletBalance = userDetails.wallet || 0;

            // Calculate remaining amount to pay (you can modify this calculation as per your logic)
            const cartTotal = req.session.cartTotal || 0;  // Make sure cartTotal is stored in session
            const updatedAmount=req.session.updatedAmount || cartTotal; //
            const remainingAmountToPay = Math.max(updatedAmount - walletBalance, 0);

            // Update session with the wallet balance and remaining amount to pay
            req.session.walletBalance = walletBalance;
            req.session.remainingAmountToPay = remainingAmountToPay;

            // Send the updated data to the frontend
            res.json({
                walletBalance,
                remainingAmountToPay,
            });
        } else {
            // If paymentMethod is not 'wallet', return an error
            res.status(400).send('Invalid payment method');
        }
    }  catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
};

const getContactPage = async (req, res, next) => {
    try {
        res.render('contact', { title: 'Contact Us' });
    } catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
};

const getPaymentMethodsPage = async (req, res, next) => {
    try {
        res.render('paymentMethods', { title: 'Payment Methods' });
    } catch (error) {
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
};

const getDeliveryPage = async (req, res, next) => {
    try {
        res.render('delivery', { title: 'Delivery Information' });
    } catch (error) {
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
};

const getReturnsAndExchangesPage = async (req, res, next) => {
    try {
        res.render('returnExchanges', { title: 'Returns & Exchanges' });
    } catch (error) {
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
};

  
module.exports = {
   pageNotFound,
    loadHomepage,
loadShopping,loadSignup,signup,verifyOtp,resendOtp,loadLogin,login,logout, 
addMoney,selectWallet,  getContactPage,
getPaymentMethodsPage,
getDeliveryPage,
getReturnsAndExchangesPage,
 };