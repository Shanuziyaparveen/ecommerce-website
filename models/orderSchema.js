const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true
  }, 
   userId: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Assuming you have a User model
    required: true
  },
  orderedItems: [{
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      default: 0
    }, 
    productStatus: {
      type: String,
      enum: ['Cancelled', 'Active','Pending', 'Processing', 'Shipped', 'Delivered', 'Return Request', 'Returned'], // Include all potential statuses
      default: 'Active'
    },
    
  }],
  totalPrice: {
    type: Number,
  
  },
  discount: {
    type: Number,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true
  },
  address: {
    name: String,
    street: String,
    landMark: String,
    city: String,
    state: String,
    pincode: String,
    phone: String,
    altPhone: String
  },
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    
    enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned']
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true
  },
  dates: {
    ordered: Date,
    shipped: Date,
    delivered: Date,
  },
  couponApplied: {
    type: Boolean,
    default: false
  },
  paymentMethod: { // Add paymentMethod field
    type: String,
    required: true,
    enum: ['Credit Card', 'Debit Card', 'PayPal', 'COD'],
  }
});

// Pre-save hook to calculate totalPrice and finalAmount
  orderSchema.pre('save', function(next) {
    if (this.orderedItems.length === 0) {
      return next(new Error('Cannot place an order with an empty cart.'));
    }
  // Validate payment method
  const validPaymentMethods = ['Credit Card', 'Debit Card', 'PayPal', 'COD'];
  if (!validPaymentMethods.includes(this.paymentMethod)) {
    return next(new Error('Invalid payment method.'));
  }

  // Calculate total price for ordered items
  this.totalPrice = this.orderedItems.reduce((total, item) => {
    if (!item.price || item.price <= 0) {
      return total; // Skip item if price is invalid
    }
    return total + (item.quantity * item.price);
  }, 0);

  // Ensure totalPrice is not 0 before applying a discount
  if (this.totalPrice === 0) {
    return next(new Error('Total price cannot be zero.'));
  }

  // Apply discount but make sure the final amount is not negative
  this.finalAmount = this.totalPrice - this.discount;
  if (this.finalAmount < 0) {
    return next(new Error('Final amount cannot be negative.'));
  }

  next(); // Proceed with saving the order
});

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
