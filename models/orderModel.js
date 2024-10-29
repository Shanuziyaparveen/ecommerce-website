const mongoose = require('mongoose');

// Define the Order schema
const orderSchema = new mongoose.Schema({
  paymentMethod: { 
    type: String, 
    required: true 
  },
  shippingCharge: { 
    type: Number, 
    required: true, 
    min: 0 // Shipping charge cannot be negative
  },
  discount: { 
    type: Number, 
    default: 0, // Default to 0 if not specified
    min: 0 // Discount cannot be negative
  },
  totalAmount: { 
    type: Number, 
    required: true, 
    min: 0 // Total amount cannot be negative
  },
  status: { 
    type: String, 
    required: true, 
    enum: ['pending', 'shipped', 'delivered', 'cancelled'], // Limit the status to predefined values
    default: 'pending' // Default status
  },
  deliverOn: { 
    type: Date, 
    required: true // Expected delivery date is required
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // Reference to the User model
    required: true 
  },
  orderItems: [{ // Inline definition of orderItems
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
    },
    price: { 
      type: Number, 
      required: true 
    }
  }],
  addressId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Address', // Reference to the Address model
    required: true 
  },
  paymentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Payment', // Reference to the Payment model
    required: true 
  },
  orderDate: { 
    type: Date, 
    default: Date.now, // Default to the current date when the order is placed
    required: true 
  },
  isPaid: { 
    type: Boolean, 
    default: false // Default to false until payment is confirmed
  },
  couponId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Coupon' // Reference to the Coupon model
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Order', orderSchema);
