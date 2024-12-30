
const User = require("../../models/userSchema");
const Address= require("../../models/addressSchema");
const Order = require("../../models/orderSchema");
const nodemailer=require("nodemailer")
const bcrypt = require("bcrypt")
const env=require("dotenv").config();
const session = require("express-session");
const { MongoTopologyClosedError } = require("mongodb");
// const { response } = require("../../app");

function generateOtp(){
    const digits="1234567890"
let otp=""
for(let i=0; i<6;i++){
    otp+=digits[Math.floor(Math.random()*10)]
}
return otp;
}
const sendVerificationEmail=async (email,otp)=>{
    try {
        const transporter=nodemailer.createTransport({
            service: "gmail",
            port:587,
            secure:false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
            
        })

        const mailOptions={
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Boots Footwear Password Reset",
           
            text: `Your Verification Code is ${otp} `,
            html: `<b><h4>Your Verification Code for password reset is: ${otp}</h4></b>`,
        }
        const info=await transporter.sendMail(mailOptions);
        console.log("email sent", info.messageId)
        return true;
    } catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}

const securePassword= async (password)=>{
    try {
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash;
    }catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
}
const getForgotPassPage=async (req,res,next)=>{
    try {
        res.render("forgot-password")
    } catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}
const forgotEmailValid=async (req, res)=>{
try {
    const email = req.body.email
    const findUser=await User.findOne({email:email});
    if(findUser){
        const otp=generateOtp();
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent) {
            req.session.userOtp=otp;
            req.session.email=email;

            res.render('forgotPass-otp');
            console.log("OTP:",otp);
            
        } else {
            res.json({success:false,message:"failed to send otp.please try again"})
    }
}else{
    res.render("forgot-password",{message: "user with this email doesnt exist"})
}
}  catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}



}
const verifyForgotPassOtp= async(req, res)=>{
    try {
        const enteredOtp=req.body.otp;
        const email=req.session.email;
        if(enteredOtp===req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"})
            
        }else{
            res.json({success:false,message:"OTP not matching"})
        }
    }  catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}
const getResetPassPage= async (req, res) => {
    try {
        res.render('reset-password')
        
    }   catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}

const resendOtp=async (req, res)=>{
    try {
        const otp=generateOtp();
        req.session.userOtp = otp;
        const email=req.session.email;
        console.log("resending otp to email:", email);
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("resend otp:",otp);
            res.status(200).json({success:true, message:"resend otp successfully"});
            
        }
    }  catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}
const postNewPassword= async (req, res) => {
    try {
        const {newPass1,newPass2}=req.body;
        const email=req.session.email;
        if(newPass1===newPass2){
            const passwordHash = await securePassword(newPass1);
            await User.updateOne({email:email}, {$set: {password: passwordHash}})
        
        res.redirect("/login")

    }else{
        res.render("reset-password",{message: "Passwords do not match"})

    } 
}  catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}
}
const userProfile = async (req, res, next) => {
    try {
      const userId = req.session.user;
      const page = parseInt(req.query.page) || 1; // Get current page (default to 1 if not provided)
  
      // Fetch user data including wallet and transactions
      const userData = await User.findById(userId).populate('transactions.orderId');
  
      if (!userData) {
        return res.status(404).send('User not found');
      }
  
      // Fetch the user's address
      const addressData = await Address.findOne({ userId });
  
      // Pagination setup for orders
      const limit = 10; // Number of orders per page
      const skip = (page - 1) * limit; // Number of orders to skip
  
      // Fetch the user's orders with pagination
      const orders = await Order.find({ userId })
        .sort({ createdOn: -1 }) // Sorting orders by creation date
        .skip(skip)
        .limit(limit);
  
      // Get the total number of orders to calculate the total number of pages
      const totalOrders = await Order.countDocuments({ userId });
      const totalPages = Math.ceil(totalOrders / limit);
  
      // Fetch the total number of transactions to calculate wallet pagination
      const totalTransactions = userData.transactions.length;
      const totalPagesTransactions = Math.ceil(totalTransactions / limit);
  
      // Render the profile page with user, wallet, address, and order details
      res.render("profile", {
        user: userData,
        userAddress: addressData,
        orders,
        currentPage: page,
        totalPages,
        wallet: {
          balance: userData.wallet, // User's wallet balance
          transactions: userData.transactions, // Wallet transactions
        },
        itemsPerPage: limit, // Pass itemsPerPage to the view
        totalPagesTransactions, // Pass totalPagesTransactions to the view
      });
    } catch (error) {
      // Handle errors and pass them to the error handler middleware
      next({
        status: error.status || 500,
        message: error.message || 'Unexpected error occurred.',
      });
    }
  };
  

const changeEmail = async (req, res) => {
    try {
      res.render("change-email");
    }catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
  };
  
  const changeEmailValid = async (req, res) => {
    try {
      const { email } = req.body;
      const userExists = await User.findOne({ email });
  
      if (userExists) {
        const otp = generateOtp(); // Corrected typo
        const emailSent = await sendVerificationEmail(email, otp);
  
        if (emailSent) {
          req.session.userOtp = otp;
          req.session.userData = req.body;
          req.session.email = email;
          res.render("change-email-otp");
          console.log("Email sent:", email);
          console.log("Otp:", otp);
        } else {
          res.json("email-error");
        }
      } else {
        res.render("change-email", {
          message: "User with this email does not exist",
        });
      }
    }   catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
  };
  
  const verifyEmailOtp = async (req, res) => {
    try {
      const enteredOtp = req.body.otp;
      if (enteredOtp === req.session.userOtp) { // Corrected session property
        res.render("new-email", {
          userData: req.session.userData, // Used session data directly
        });
      } else {
        res.render("change-email-otp", {
          message: "OTP does not match",
          userData: req.session.userData,
        });
      }
    }  catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
  };
  const updateEmail=async (req, res) => {
try {
    const newEmail = req.body.newEmail;
    const userId=req.session.user;
    await User.findByIdAndUpdate(userId, {email: newEmail});
    res.redirect("/userProfile")
} catch (error) {
    res.redirect("/pageNotFound")
}

  }

  const changePassword = async(req,res,next) => {

try {
    res.render("change-password")
}  catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}
  }


  const changePasswordValid=async (req, res) => {
    try {
        const {email}=req.body;
        const userExists=await User.findOne({email})
        if(userExists){
            const otp=generateOtp();
            const emailSent=await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.userData=req.body;
                req.session.email=email;
                res.render("change-password-otp");
                console.log("Email sent your otp is:", otp);
            }else{
                res.json({
                    success:false,
                    message:"Failed to send otp. please try again"
                })
        }
    }else {
        res.render("change-password",{
            message: "User with this email does not exist"
        })
    }
    }  catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}

const verifyChangePassOtp=async (req, res) => {
try {
    const enteredOtp=req.body.otp;
    if(enteredOtp===req.session.userOtp){
        res.json({success:true,redirectUrl:"/reset-password"})
    }else{
        res.json({success:false,message:"OTP does not match"})
    }
}  catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}


}
const addAddress=async (req, res) => {
try {
    const user=req.session.user;
    res.render("add-address",{user:user})
}  catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}



}
const postAddAddress = async (req, res) => {
    try {
      const userId = req.session.user._id; // Ensure this is the correct way to get the user ID
      const userData = await User.findById(userId);
  
      const { addressType, name, city, landMark, state, pincode, phone, altPhone } = req.body;
      
      let userAddress = await Address.findOne({ userId: userData._id });
      
      if (!userAddress) {
        const newAddress = new Address({
          userId: userData._id,
          address: [{ addressType, name, city, landMark, state, pincode, phone, altPhone }]
        });
        await newAddress.save();
      } else {
        userAddress.address.push({ addressType, name, city, landMark, state, pincode, phone, altPhone });
        await userAddress.save();
      }
      
      res.redirect("/userProfile");
    }  catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
  };
  
  const editAddress=async (req,res,next)=>{
      try {
          const addressId=req.query.id;
          const user=req.session.user;
          const currAddress=await Address.findOne({"address._id": addressId,});
          if(!currAddress){
              return res.redirect("/pageNotFound")
          }
          const addressData=currAddress.address.find((item)=>{
              return item._id.toString()===addressId.toString()
          })
          if(!addressData){
              return res.redirect("/pageNotFound")
          }res.render("edit-address",{address:addressData,user:user})
      }   catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
  }
  
  const postEditAddress=async (req, res) => {
  try {
      const data=req.body;
  const addressId=req.query.id;
  const user=req.session.user;
  const findAddress=await Address.findOne({"address._id":addressId});
  
  if(!findAddress){
      res.redirect("/pageNotFound")
  }
  await Address.updateOne(
      {"address._id":addressId},{$set:{
          "address.$":{
              _id:addressId,
              addressType:data.addressType,
              name:data.name,
              city:data.city,
              landmark:data.landMark,
              state:data.state,
              pincode:data.pincode,
              phone:data.phone,
              altPhone:data.altPhone
          }
      }}
  )
  res.redirect("/userProfile")
  }   catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}
  
  
  
  }
  
  
const deleteAddress=async (req,res,next)=>{
    try {
        const addressId=req.query.id;
        const findAddress=await Address.findOne({"address._id":addressId})
        if(!findAddress){
            return res.status(404).send("Address not found")
        }

        await Address.updateOne({
            "address._id":addressId
        },
        {$pull:{
            address: {
                _id:addressId
            }
        }
      }
    )
    res.redirect("/userProfile")
    }   catch (error) {
        // Forward the error with a status if it exists
        next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
    }
}



















    module.exports={
        getForgotPassPage,forgotEmailValid, verifyForgotPassOtp,getResetPassPage,resendOtp,postNewPassword,userProfile,changeEmail,changeEmailValid,verifyEmailOtp,
        updateEmail,changePassword,changePasswordValid,verifyChangePassOtp,addAddress,postAddAddress,editAddress,postEditAddress,deleteAddress,
    }