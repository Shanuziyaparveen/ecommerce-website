const mongoose = require('mongoose');

// Define the Payment schema
const paymentSchema = new mongoose.Schema({
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'completed', 'failed', 'refunded'], // Possible payment statuses
    default: 'pending' // Default status
  },
  paymentMethod: { 
    type: String, 
    required: true // e.g., "Credit Card", "PayPal", etc.
  },
  amount: { 
    type: Number, 
    required: true, 
    min: 0 // Amount should not be negative
  },
  orderId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order', // Reference to the Order model
    required: true 
  },
  paymentStatus: { 
    type: String, 
    required: true, 
    enum: ['success', 'failure', 'pending'], // Payment processing statuses
    default: 'pending' // Default status
  },
  transactionDate: { 
    type: Date, 
    default: Date.now, // Default to the current date
    required: true 
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Payment', paymentSchema);
