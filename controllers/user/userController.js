const User =require("../../models/userSchema")
const nodemailer = require("nodemailer")
const env=require("dotenv").config();
const bcrypt=require("bcrypt")


const loadHomepage = async (req, res) => {
    try {
        const user = req.session.user; // This should be an object now
        console.log("Session user:", user); // Log the entire user object

        if (user) {
            // Make sure user._id is defined
            console.log("User ID from session:", user._id);
            const userData = await User.findById(user._id); // Use findById for clarity
            console.log("User data from DB:", userData);
            res.render('home', { user: userData });
        } else {
            return res.render('home');
        }
    } catch (error) {
        console.log("Home page not found");
        res.status(500).send("Server error");
    }
};

const pageNotFound=async(req,res)=>{
    try{
        res.render("page-404")
    }catch(error){
        res.redirect("/pageNotFound")
    }
}
const loadSignup=async(req,res)=>{
    try{
        res.render("signup")
    }catch(error){
        console.log("signup page not loading", error);
        
        res.status(500).send("server error")
    }
}
const loadShopping=async(req,res)=>{
    try{
        res.render("shop")
    }catch(error){
        console.log("shopping page not loading", error);
        
        res.status(500).send("server error")
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
    } catch (error) {
        console.error("error sending email",error);
        return false;
    }
}
const signup = async(req,res)=>{
    try{
const{name, phone ,email,password,cPassword}=req.body;
if(password!==cPassword){
    return res.render("signup",{message:"Password do not match"});

}
const findUser= await User.findOne({email})
if(findUser){
    return res.render("signup",{message:"User with this email already exists"});

}
const otp=generateOtp();
const emailSend = await sendVerificationEmail(email,otp);
if(!emailSend){
    return res.json("email-error")
}

req.session.userOtp = otp;
req.session.userData={name,phone,email,password};
res.render("verify-otp");
console.log("OTP sent",otp);

    }catch(error){
        console.error("signup error",error);
        res.redirect("/pageNotFound")
    }
}
const securePassword=async(password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash;
    } catch (error) {
        
    }
}
const verifyOtp=async (req,res)=>{
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
            })
            await saveUserData.save();
            req.session.user=saveUserData._id;
            res.json({success:true,redirectUrl:"/"})
        }else{
            res.status(400).json({success:false,message:"Invalid OTP,please try again"})
        }
        
    } catch (error) {
        console.error("Error Verifying OTP",error);
        res.status(500).json({success:false,message:"An error occured"})
    }
}

const resendOtp=async(req,res)=>{
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
    } catch (error) {
        console.error("error resending the OTP",error);
        res.status(500).json({success:false,message:"Internal Server Error,please try again"})
        
    }
}
const loadLogin = async (req,res)=>{
    try {
        if(!req.session.user){
            return res.render("login")
        }else{
            res.redirect("/")
        }
    } catch (error) {
        res.redirect("/pageNotFound")
        
    }

}
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: 0, email: email });
        
        if (!findUser) {
            return res.render("login", { message: "User not found" });
        }

        if (findUser.isBlocked) {
            return res.render("login", { message: "User is blocked by admin" });
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect password" });
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
    } catch (error) {
        console.error("login error", error);
        res.render("login", { message: "Login failed. Please try again" });
    }
}

const logout=  async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("session destruction error",err.message);
                return res.redirect("/pageNotFound")
            }
            return res.redirect("/login")
        })
    } catch (error) {
        console.log("Logout error",error);
        res.redirect("/pageNotFound")
    }
}
module.exports = {
   pageNotFound,
    loadHomepage,
loadShopping,loadSignup,signup,verifyOtp,resendOtp,loadLogin,login,logout};