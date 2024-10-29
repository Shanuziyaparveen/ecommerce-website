const mongoose = require('mongoose');

// Define the Review schema
const reviewSchema = new mongoose.Schema({
  rating: { 
    type: Number, 
    required: true, 
    min: 1, // Minimum rating value
    max: 5 // Maximum rating value
  },
  reviewText: { 
    type: String, 
    required: true, // Review text is required
    trim: true // Removes whitespace from both ends
  },
  reviewDate: { 
    type: Date, 
    default: Date.now, // Default to the current date when the review is created
    required: true 
  },
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', // Reference to the Product model
    required: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // Reference to the User model
    required: true 
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Review', reviewSchema);
