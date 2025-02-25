const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require('uuid');


const generateOrderId = () => {
  const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  return "B" + randomPart;
};

const orderSchema = new Schema({
  orderId: {
    type: String,
    default: generateOrderId,
    unique: true
  },
  razorpayOrderId: {  // New field for Razorpay Order ID
    type: String, 
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
      enum: ['Cancelled', 'Placed','Active','Pending', 'Processing', 'Shipped', 'Delivered', 'Return Request', 'Returned'], // Include all potential statuses
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
    
    enum: ['Placed','Pending','Payment Successful','Payment Pending','Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Return Request', 'Returned']
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
  } ,
  coupon: {
    applied: {
      type: Boolean,
      default: false
    },
    code: String,
    discount: {
      type: Number,
      default: 0
    }
  },
  returnReason: {
    type: String,
    default: null, // Optional field for storing the return reason
  },
  paymentMethod: { // Add paymentMethod field
    type: String,
    required: true,
    enum: ['Razorpay', 'Debit Card', 'PayPal', 'COD'],
  },
  wallet: {
    used: {
      type: Number,
      default: 0, // Amount of wallet balance used for the current order
    },
    remaining: {
      type: Number,
      default: 0, // Remaining wallet balance after usage
    }
  },
  totalAmount: {
    type: Number,
   
  },
});

orderSchema.pre('save', function (next) {
  // Check if orderedItems are empty
  if (!this.orderedItems || this.orderedItems.length === 0) {
    return next(new Error('Cannot place an order with an empty cart.'));
  }

  // Validate payment method
  const validPaymentMethods = ['Razorpay', 'Debit Card', 'PayPal', 'COD'];
  if (!validPaymentMethods.includes(this.paymentMethod)) {
    return next(new Error('Invalid payment method.'));
  }

  // Calculate total price for ordered items
  this.totalPrice = this.orderedItems.reduce((total, item) => {
    if (!item.price || item.price <= 0) {
      return total; // Skip item if price is invalid
    }
    return total + item.quantity * item.price;
  }, 0);

  // Check if the total price is zero
  if (this.totalPrice === 0) {
    return next(new Error('Total price cannot be zero.'));
  }

  next(); // Proceed with saving the order
});


const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
