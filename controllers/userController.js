const UserModel = require('../models/userModel.js');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const ENV = require('../config/config.js');
const otpGenerator = require('otp-generator');
const { sendOTP, requestOTP } = require('../controllers/mailer');
const OTPModel = require('../models/otpModel.js');


/** middleware for verify user */
async function verifyUser(req, res, next) {
    try {
        const { username } = req.method == "GET" ? req.query : req.body;

        // check the user existence
        let exist = await UserModel.findOne({ username });
        if (!exist) return res.status(404).send({ error: "Can't find User!" });
        next();

    } catch (error) {
        return res.status(404).send({ error: "Authentication Error" });
    }
}
async function register(req, res) {
    try {
        const { username, password, profile, email } = req.body;

        // Check the existence of the username and email
        const existUsername = UserModel.findOne({ username }).exec();
        const existEmail = UserModel.findOne({ email }).exec();

        await Promise.all([existUsername, existEmail])
            .then(([usernameCheck, emailCheck]) => {
                if (usernameCheck) throw { error: "Please use a unique username" };
                if (emailCheck) throw { error: "Please use a unique email" };

                // Proceed to create user if no conflicts are found
                if (password) {
                    bcrypt.hash(password, 10)
                        .then(hashedPassword => {
                            const user = new UserModel({
                                username,
                                password: hashedPassword,
                                profile: profile || '',
                                email
                            });

                            // Save and respond
                            user.save()
                                .then(result => res.status(201).send({ msg: "User Registered Successfully" }))
                                .catch(error => res.status(500).send({ error: error.message || "Failed to save user" }));

                        }).catch(error => {
                            res.status(500).send({ error: "Unable to hash password" });
                        });
                } else {
                    res.status(400).send({ error: "Password is required" });
                }
            }).catch(error => {
                res.status(400).send(error);  // Handle unique username/email conflict
            });

    } catch (error) {
        console.error("Registration error:", error);  // Log detailed error on the server
        res.status(500).send({ error: error.message || "Registration failed due to server error" });
    }
}


async function login(req, res) {
    const { username, password } = req.body;

    try {
        UserModel.findOne({ username })
            .then(user => {
                bcrypt.compare(password, user.password)
                    .then(passwordCheck => {
                        if (!passwordCheck) return res.status(400).send({ error: "Incorrect Password" });

                        // create jwt token
                        const token = jwt.sign({
                            userId: user._id,
                            username: user.username
                        }, ENV.JWT_SECRET, { expiresIn: "24h" });

                        return res.status(200).send({
                            msg: "Login Successful!",
                            username: user.username,
                            token
                        });
                    })
                    .catch(error => {
                        return res.status(400).send({ error: "Password does not match" });
                    });
            })
            .catch(error => {
                return res.status(404).send({ error: "Username not found" });
            });

    } catch (error) {
        return res.status(500).send({ error });
    }
}

async function getUser(req, res) {
    const { username } = req.params;

    try {
        if (!username) return res.status(501).send({ error: "Invalid Username" });

        UserModel.findOne({ username }, function (err, user) {
            if (err) return res.status(500).send({ err });
            if (!user) return res.status(501).send({ error: "Couldn't Find the User" });

            /** remove password from user */
            const { password, ...rest } = Object.assign({}, user.toJSON());

            return res.status(201).send(rest);
        });

    } catch (error) {
        return res.status(404).send({ error: "Cannot Find User Data" });
    }
}

async function updateUser(req, res) {
    try {
        const { userId } = req.user;

        if (userId) {
            const body = req.body;

            // update the data
            UserModel.updateOne({ _id: userId }, body, function (err, data) {
                if (err) throw err;

                return res.status(201).send({ msg: "Record Updated!" });
            });

        } else {
            return res.status(401).send({ error: "User Not Found!" });
        }

    } catch (error) {
        return res.status(401).send({ error });
    }
}
// Generate OTP Function
function generateOTP() {
    return otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false,
        digits: true
    });
}

// Request Email Verification
async function requestEmailVerification(req, res) {
    console.log("Email :" + req.body.email)
    const email = req.body.email;

    try {
        console.log("Inside try")
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) {
            console.log("Inside if")
            return res.status(400).send({ error: "Email is already registered" });
        }

        const otp = generateOTP();
        console.log("otp:"+otp)

        await sendOTP(email, otp);
        
        const otpEntry = new OTPModel({ email, otp, expiresAt: Date.now() + 10 * 60 * 1000 });
        await otpEntry.save();
        console.log("After save")
        return res.status(200).send({ msg: "OTP sent to email for verification" });
    } catch (error) {
        console.error("Error sending OTP:", error);
        return res.status(500).send({ error: "Failed to send OTP" });
    }
}

// Verify Email and Register
async function verifyEmailAndRegister(req, res) {
    const { email, username, password, otp } = req.body;

    try {
        const otpEntry = await OTPModel.findOne({ email, otp });
        if (!otpEntry || otpEntry.expiresAt < Date.now()) {
            return res.status(400).send({ error: "Invalid or expired OTP" });
        }

        const existingUsername = await UserModel.findOne({ username });
        if (existingUsername) {
            return res.status(400).send({ error: "Username already taken" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new UserModel({
            username,
            password: hashedPassword,
            email,
            profile: req.body.profile || ''
        });

        await user.save();
        await OTPModel.deleteOne({ email }); // Clean up OTP after successful registration

        return res.status(201).send({ msg: "User registered successfully" });
    } catch (error) {
        console.error("Registration error:", error);
        return res.status(500).send({ error: "Registration failed" });
    }
}

// OTP Verification Function
async function verifyOTP(req, res) {
    const { email, otp } = req.body;

    try {
        const otpEntry = await OTPModel.findOne({ email, otp });
        if (!otpEntry || otpEntry.expiresAt < Date.now()) {
            return res.status(400).send({ error: "Invalid or expired OTP" });
        }

        await OTPModel.deleteOne({ email }); // Clear OTP after successful verification
        return res.status(200).send({ msg: "OTP verified successfully!" });
    } catch (error) {
        console.error("Error during OTP verification:", error);
        return res.status(500).send({ error: "Error during OTP verification." });
    }
}

// Create Reset Session Function
async function createResetSession(req, res) {
    if (req.app.locals.resetSession) {
        return res.status(201).send({ flag: req.app.locals.resetSession });
    }
    return res.status(440).send({ error: "Session expired!" });
}
module.exports = {
    verifyUser,
    register,
    login,
    getUser,
    updateUser,
    generateOTP,
    verifyOTP,
    createResetSession,
    requestEmailVerification,
    verifyEmailAndRegister};