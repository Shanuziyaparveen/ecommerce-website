const mongoose = require('mongoose');

// Define the Wishlist schema
const wishlistSchema = new mongoose.Schema({
  products: [
    {
      productId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', // Reference to the Product model
        required: true 
      },
      color: { 
        type: String, 
        required: true // Color is required
      },
      size: { 
        type: String, 
        required: true // Size is required
      }
    }
  ],
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // Reference to the User model
    required: true 
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Wishlist', wishlistSchema);
