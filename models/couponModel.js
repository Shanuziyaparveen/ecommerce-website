const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, // Ensures each coupon code is unique
    trim: true // Removes any trailing spaces
  },
  amount: { 
    type: Number, 
    required: true, 
    min: 0 // Amount must be greater than or equal to 0
  },
  expireOn: { 
    type: Date, 
    required: true // Expiration date is necessary
  },
  minPurchase: { 
    type: Number, 
    required: true, 
    min: 0 // Minimum purchase must be greater than or equal to 0
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Coupon', couponSchema);
