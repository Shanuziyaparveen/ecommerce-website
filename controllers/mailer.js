const otpGenerator = require('otp-generator');
const nodemailer = require('nodemailer');
const Mailgen = require('mailgen');
require('dotenv').config();
const UserModel = require('../models/userModel.js');

const nodeConfig = {
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
    }
};

const transporter = nodemailer.createTransport(nodeConfig);

const MailGenerator = new Mailgen({
    theme: "default",
    product: {
        name: "Boots",
        link: 'http://Boots.com/'
    }
});

async function sendOTP(email,otp) {
    // const otp = otpGenerator.generate(6, { upperCase: false, specialChars: false });
    
    // Save the OTP and associated email to the database here (using your User model)
    await UserModel.updateOne({ email }, { otp }); // Save OTP to user's record

    // Construct the OTP email content
    const emailContent = {
        body: {
            name: "User",
            intro: `Your OTP is ${otp}. It is valid for the next 10 minutes.`,
            outro: "If you did not request this OTP, please ignore this email."
        }
    };

    const emailBody = MailGenerator.generate(emailContent);
    console.log(email)
    const message = {
        from: process.env.EMAIL,
        to: email,
        subject: "Your OTP for Verification",
        html: emailBody
    };

    // console.log(message)
    await transporter.sendMail(message);
    console.log("After mailer")
    return otp; // For debugging or logging, remove in production
}

// Controller function to handle OTP requests
const requestOTP = async (req, res) => {
    const { email } = req.body.email;
    try {
        await sendOTP(email);
        res.status(200).send({ msg: "OTP sent successfully to your email." });
    } catch (error) {
        res.status(500).send({ error: "Failed to send OTP. Please try again." });
    }
};

module.exports = { sendOTP,requestOTP };
