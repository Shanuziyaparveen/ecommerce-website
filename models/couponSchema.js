const mongoose = require("mongoose");

const { Schema } = mongoose;

const couponSchema = new Schema({
    name: {
        type: String,
        required: true,  // Ensure the name is always provided
        trim: true,      // Remove any leading or trailing spaces
    },
    couponcode: {
        type: String,
        required: true,  // Ensure the coupon code is always provided
        unique: true,    // Ensure coupon codes are unique
        trim: true,      // Remove any leading or trailing spaces
        match: [/^[A-Za-z0-9]+$/, 'Coupon code can only contain alphanumeric characters.']  // Optional regex for coupon code validation
    },
    cashback: {
        type: Number,
        required: true,  // Ensure cashback is provided
    },
    minamount: {
        type: Number,
        required: true,  // Ensure the minimum amount is provided
        min: [0, 'Minimum amount must be a positive number'], // Prevent negative minimum amount
    },
    expdate: {
        type: Date,
        required: true,  // Ensure the expiration date is provided
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],  // Allow only "active" or "inactive" status
        default: 'active', // Default to active if not specified
    }
}, {
    timestamps: true,  // Automatically add createdAt and updatedAt timestamps
});

// Index couponcode for faster lookups
couponSchema.index({ couponcode: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
