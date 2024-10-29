const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // Reference to the User model
    required: true 
  },
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', // Reference to the Product model
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 // Minimum quantity should be 1
  },
  size: { 
    type: String, 
    required: true 
  }
}, { timestamps: { createdAt: true, updatedAt: false } }); // Adds only createdAt field

module.exports = mongoose.model('Cart', cartSchema);
