const crypto = require('crypto');

// Function to generate a referral code
const generateReferralCode = () => crypto.randomBytes(4).toString('hex');

module.exports = { generateReferralCode };
