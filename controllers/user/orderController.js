const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/couponSchema");
const Razorpay = require('razorpay');
require('dotenv').config();
 // Import Razorpay SDK
 const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_ID_KEY,   // Razorpay key ID from .env file
  key_secret: process.env.RAZORPAY_SECRET_KEY  // Razorpay key secret from .env file
});
const getPaymentPage = async (req, res) => {
  try {
    // Check if applyWallet is true and remainingAmountToPay is 0, then skip payment page rendering
    if (req.session.applyWallet && req.session.remainingAmountToPay === 0) {
      return res.redirect('/confirm-order');  // Redirect to the order summary page or wherever appropriate
    }

    // Retrieve the cart from the session
    const cartItems = req.session.cart || [];  // Default to an empty array if cart is not defined

    // Initialize the variables to calculate the total price and discount
    let cartTotal = 0;
    let discount = 0;

    // Check if there are items in the cart before calculating
    if (cartItems.length > 0) {
      // Loop through each item in the cart and calculate total and discount
      cartItems.forEach(item => {
        // Calculate cart total based on regular price and quantity
        cartTotal += item.quantity * item.regularPrice;

        // Calculate discount based on sale price and quantity
        discount += item.quantity * item.salePrice;
      });
    }

    // Calculate the final amount after applying discount
    const finalAmount = cartTotal + (req.session.tax || 0); // Assuming tax is stored in session

    // Get coupon details from session if any
    const couponDiscount = req.session.couponDiscount || 0; // Apply the coupon discount from session if any

    // Calculate the discounted amount after applying the coupon
    const discountedAmount = finalAmount - couponDiscount;

    // Render the payment page with the necessary data
    res.render('payment', {
      pageTitle: 'Select Payment Method',
      cartTotal,
      discount,
      finalAmount,
      discountedAmount,
      availableMethods: ['Razorpay', 'Debit Card', 'UPI', 'Net Banking', 'COD'],
      couponApplied: couponDiscount > 0 // Check if there is any coupon applied
    });
  } catch (error) {
    console.error('Error rendering payment page:', error);
    res.status(500).render('error', { errorMessage: 'Server Error' });
  }
};
const processPayment = async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const userId = req.session.user;

    // Ensure the user is logged in
    if (!userId) {
      return res.status(401).render('error', { errorMessage: "User not logged in" });
    }

    // Retrieve cart with populated product details
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    // Ensure cart has valid items
    if (!cart || !cart.items.length) {
      return res.status(400).render('error', { errorMessage: "Your cart is empty. Please add items to proceed." });
    }

    const selectedAddress = req.session.selectedAddress;
    if (!selectedAddress) {
      return res.status(400).render('error', { errorMessage: "Please select a delivery address to proceed." });
    }

    // Calculate totals
    const cartTotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const cartTax = cartTotal * 0.1;
    const remainingAmountToPay = req.session.remainingAmountToPay || 0;

    console.log("remaining amount to pay: " + remainingAmountToPay);
    
   let finalAmount =remainingAmountToPay;
    console.log("final amount to pay: " + finalAmount);
    
    const totalAmount = cartTotal+cartTax;


    if (finalAmount <= 0) {
      return res.status(400).render('error', { errorMessage: "Invalid final amount." });
    }
 // Check product stock before proceeding with the order
 for (const item of cart.items) {
  const product = await Product.findById(item.productId._id);  // Fetch the current product from DB

  if (!product || product.quantity < item.quantity) {
    return res.status(400).render('error', {
      errorMessage: `Insufficient stock for product: ${product.name}. Only ${product.quantity} items are available.`
    });
  }
}

    // Handle COD order
    if (paymentMethod === 'COD') {
      console.log("Processing COD order");

      const newOrder = new Order({
        userId,
        address: selectedAddress,
        orderedItems: cart.items.map(item => ({
          product: item.productId._id,
          quantity: item.quantity,
          price: item.price,
          totalPrice: item.totalPrice,
          productStatus: 'Pending',
        })),
        paymentMethod: 'COD',
        totalAmount,
        finalAmount,
        coupon: {
          applied: req.session.couponApplied || false,
          code: req.session.couponCode || null,
          discount: req.session.couponDiscount || 0,
        },
        status: 'Pending',
        dates: { ordered: new Date() },
      });

      await newOrder.save();
      console.log('Order saved:', newOrder);

         // Deduct the stock from each ordered product
         for (const item of cart.items) {
          const product = await Product.findById(item.productId._id);
          product.quantity -= item.quantity;  // Deduct stock
          await product.save();  // Save updated product
        }
      req.session.orderId = newOrder._id;
      
      return res.json({
        success: true,
        msg: 'Your order has been successfully placed!',
        order: newOrder,
      });
    }

    // Handle Razorpay order
    if (paymentMethod === 'Razorpay') {
      console.log("Razorpay selected");

      const options = {
        amount: finalAmount * 100, // Razorpay expects amount in paise
        currency: 'INR',
        receipt: `order_${userId}_${Date.now()}`,
        payment_capture: 1,
      };

      razorpayInstance.orders.create(options, async(err, order) => {
        if (err) {
          console.error("Razorpay Order creation failed:", err);
          return res.status(500).json({ success: false, msg: `Razorpay order creation failed: ${err.message}` });
        }
        // Save the Razorpay order to the database after successful order creation
        const newOrder = new Order({
          userId,
          address: selectedAddress,
          orderedItems: cart.items.map(item => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.price,
            totalPrice: item.totalPrice,
            productStatus: 'Pending',
          })),
          paymentMethod: 'Razorpay',
          razorpayOrderId: order.id,  // Save Razorpay order ID
          totalAmount,
          finalAmount,
          coupon: {
            applied: req.session.couponApplied || false,
            code: req.session.couponCode || null,
            discount: req.session.couponDiscount || 0,
          },
          status: 'Pending',
          dates: { ordered: new Date() },
        });

        await newOrder.save();
        console.log('Razorpay Order saved:', newOrder);

        // Deduct the stock from each ordered product
        for (const item of cart.items) {
          const product = await Product.findById(item.productId._id);
          product.quantity -= item.quantity;  // Deduct stock
          await product.save();  // Save updated product
        }

        req.session.orderId = newOrder._id;


        res.status(200).json({
          success: true,
          msg: 'Order Created',
          order_id: order.id,
          amount: finalAmount,
          key_id: process.env.RAZORPAY_ID_KEY,
          cartItems: cart.items,
          address: selectedAddress,
          totalAmount,
          cartTax,
          finalAmount,
          coupon: {
            applied: req.session.couponApplied || false,
            code: req.session.couponCode || null,
            discount: req.session.couponDiscount || 0,
          },
          totalItems: cart.items.length,
          paymentMethod,
          contact: selectedAddress.phone,
          name: req.session.user.name,
          email: req.session.user.email,
        });
      });

      return; // Avoid proceeding further after async operation.
    }

    // Handle invalid payment method
    return res.status(400).render('error', { errorMessage: "Invalid payment method selected" });

  } catch (error) {
    console.error("Error processing payment:", error);
    res.status(500).render('error', { errorMessage: "An error occurred while processing your payment." });
  }
};


const confirmOrder = async (req, res) => { 
  try {
    console.log("Confirming order process started...");

    const userId = req.session?.user?._id;
    console.debug("User ID:", userId);
    
    if (!userId) {
      console.warn("User not logged in.");
      return res.status(401).render('error', { errorMessage: "User not logged in" });
    }

    // Retrieve orderId from session
    const orderId = req.session.orderId;
    console.debug("Session Order ID:", orderId);

    if (!orderId) {
      console.warn("Order ID not found in session.");
      return res.status(400).render('error', { errorMessage: "Order not found. Please place an order first." });
    }

    // Fetch the order details from the database
    const order = await Order.findById(orderId).populate({
      path: 'orderedItems.product',
      select: 'productName productImage price',
    });
    console.debug("Fetched Order:", order);

    if (!order) {
      console.error("Order not found in database.");
      return res.status(404).render('error', { errorMessage: "Order not found in the database." });
    }

    const walletBalance = req.session.user.wallet || 0;
    console.debug("User Wallet Balance:", walletBalance);

    const usedWalletAmount = walletBalance > order.totalAmount ? order.totalAmount : walletBalance;
    const remainingWalletAmount = walletBalance - usedWalletAmount;
    console.debug("Wallet Deduction:", usedWalletAmount, "Remaining Wallet Balance:", remainingWalletAmount);

    // Clear the cart after order placement
    const cartClearResult = await Cart.updateOne({ userId }, { $set: { items: [] } });
    console.debug("Cart Clear Result:", cartClearResult);

    // Update user's wallet and transaction history
    const transaction = {
      amount: usedWalletAmount,
      type: 'Redeemed',
      date: new Date(),
      orderId: order._id,
      status: 'Used',
    };

    const userUpdateResult = await User.findByIdAndUpdate(
      userId,
      {
        $set: { wallet: remainingWalletAmount },
        $push: { transactions: transaction },
      },
      { new: true }
    );
    console.debug("User Wallet Update Result:", userUpdateResult);

    // Render the order confirmation page
    console.log("Rendering order confirmation page...");
    res.render('orderDetails', {
      cartItems: order.orderedItems,
      totalItems: order.orderedItems.length,
      address: order.address,
      paymentMethod: order.paymentMethod,
      cartTax: order.cartTax,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      walletDeduction: usedWalletAmount,
      walletBalance: remainingWalletAmount,
    });

    // Clear session data after rendering the order details
    req.session.orderId = null;
    req.session.selectedAddress = null;
    req.session.paymentMethod = null;
    req.session.remainingAmountToPay = null;
    console.log("Session data cleared successfully.");
    
  } catch (error) {
    console.error("Error rendering order confirmation:", error);
    return res.status(500).render('error', { errorMessage: "An error occurred while processing your order." });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const orderId = req.query.id; // Get the order ID from the query parameters
    const userId = req.session.user; // Assuming the user ID is stored in the session

    // Find the order by ID
    const order = await Order.findById(orderId);
    if (!order) {
      console.error('Order not found');
      return res.redirect('/userProfile'); // Redirect if order not found
    }

    // Check if the order is already cancelled
    if (order.status === 'Cancelled') {
      console.error('Order is already cancelled');
      return res.redirect('/userProfile');
    }

    // Update the order status to 'Cancelled'
    order.status = 'Cancelled';
    await order.save();

    // Add the final amount back to the user's wallet and log the transaction
    const user = await User.findById(userId);
    if (!user) {
      console.error('User not found');
      return res.redirect('/userProfile');
    }
  // Refund logic based on payment method
  if (order.paymentMethod === 'Razorpay') {
    const refundAmount = order.finalAmount;
    user.wallet += refundAmount;

    // Log the transaction
    user.transactions.push({
      amount: refundAmount,
      type: 'Refund',
      orderId: order._id,
      status: 'Completed',
    });

    await user.save();
    console.log(`Order ${orderId} cancelled and ₹${refundAmount} refunded to wallet.`);
  } else {
    console.log(`Order ${orderId} cancelled. No wallet refund needed for payment method: ${order.paymentMethod}`);
  }

    res.redirect('/userProfile');
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.redirect('/pageNotFound');
  }
};
const viewOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      console.error('Order ID is missing in the request.');
      return res.status(400).render('error', { errorMessage: 'Invalid Order Request!' });
    }

    const order = await Order.findById(id)
      .populate('orderedItems.product', 'productName salePrice regularPrice productImage');

    if (!order) {
      console.error(`Order with ID ${id} not found.`);
      return res.status(404).render('error', { errorMessage: 'Order not found!' });
    }

    // Calculate total discount and wallet amount
    const discount = order.discount || (order.coupon && order.coupon.discount) || 0;
    const walletAmount = order.wallet.used || 0;

    res.render('viewOrderDetails', {
      order,
      address: order.address,
      discount,
      walletAmount,
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.redirect('/pageNotFound'); // Redirect to a 404 or error page
  }
};

const cancelSpecificItem = async (req, res) => {
  const productId = req.params.id;
  const orderId = req.query.orderId;
  try {
    const order = await Order.findById(orderId);
    const item = order.orderedItems.find(item => item.product.toString() === productId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found in order' });
    }

    // Update product status to "Cancelled"
    await Order.updateOne(
      { _id: orderId, "orderedItems.product": productId },
      { $set: { "orderedItems.$.productStatus": "Cancelled" } }
    );

    // Wallet refund logic
    const refundAmount = item.price * item.quantity;
    const user = await User.findById(order.userId);
   // Refund logic based on payment method
  if (order.paymentMethod === 'Razorpay') {
    const refundAmount = order.finalAmount;
    user.wallet += refundAmount;

    // Log the transaction
    user.transactions.push({
      amount: refundAmount,
      type: 'Refund',
      orderId: order._id,
      status: 'Completed',
    });

    await user.save();
    console.log(`Order ${orderId} cancelled and ₹${refundAmount} refunded to wallet.`);
  } else {
    console.log(`Order ${orderId} cancelled. No wallet refund needed for payment method: ${order.paymentMethod}`);
  }

    // Update order status
    const updatedOrder = await Order.findById(orderId).populate('orderedItems.product');
    const allCancelled = updatedOrder.orderedItems.every(item => item.productStatus === 'Cancelled');
    updatedOrder.status = allCancelled ? 'Cancelled' : 'Pending';
    await updatedOrder.save();

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Error canceling product:", error);
    res.status(500).json({ success: false, message: "Failed to cancel the product." });
  }
};

const returnOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body;

    if (!orderId || !reason) {
      return res.status(400).json({ success: false, message: 'Order ID and reason are required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if the order is already returned or cancelled
    if (order.status === 'Return Request' || order.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already in return or cancelled status' });
    }

    // Update the order status and return reason
    order.status = 'Return Request';
    order.returnReason = reason;
    await order.save();

    // Calculate refund amount and update user's wallet
    const refundAmount = order.orderedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const user = await User.findById(order.userId);
    user.wallet += refundAmount;
    user.transactions.push({
      amount: refundAmount,
      type: 'Order Return',
      orderId,
      status: 'Pending',
    });
    await user.save();

    res.json({ success: true, message: 'Return request submitted successfully, and refund is processed.' });
  } catch (err) {
    console.error('Error while submitting return request:', err);
    res.status(500).json({ success: false, message: 'An error occurred while processing the return request.' });
  }
};const couponApply = (req, res) => {
  const { couponCode, totalAmount } = req.body;
  const userId = req.session.user?._id;  // Ensure user ID is correctly fetched from session

  // Validate input
  if (!couponCode || !totalAmount || !userId) {
    return res.status(400).json({ success: false, message: "Missing coupon code, total amount, or user ID" });
  }

  Coupon.findOne({ couponcode: couponCode })
    .then(coupon => {
      if (!coupon || coupon.status !== "active") {
        return res.status(400).json({ success: false, message: "Invalid or expired coupon" });
      }

      if (coupon.minamount > totalAmount) {
        return res.status(400).json({ success: false, message: "Total amount is less than the minimum required for this coupon" });
      }

      User.findById(userId)
        .then(user => {
          if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
          }

          const discount = coupon.cashback;
          const updatedAmount = Math.max(totalAmount - discount, 0); // Prevent negative totals
let remainingAmountToPay=updatedAmount;
          // Save coupon application status and discount to session
          req.session.couponApplied = true;
          req.session.couponDiscount = discount;
          req.session.updatedAmount = updatedAmount;
req.session.remainingAmountToPay=remainingAmountToPay;
          // Debug logs
          console.log("Coupon Applied:", req.session.couponApplied);
          console.log("Discount:", req.session.couponDiscount);
          console.log("Updated Amount:", req.session.updatedAmount);
          console.log("Session Data:", req.session);  // Full session data for reference
         
          res.json({
            success: true,
            updatedAmount,
            discount
          });

        })
        
        .catch(err => {
          console.error("Error finding user:", err);
          res.status(500).json({ success: false, message: "Error processing the coupon" });
        });
    })
    .catch(err => {
      console.error("Error finding coupon:", err);
      res.status(500).json({ success: false, message: "Error processing the coupon" });
    });
};
const getconfirmOrder = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).render('error', { errorMessage: "User not logged in" });
    }

    const orderId = req.session.orderId;
    if (!orderId) {
      return res.status(400).render('error', { errorMessage: "Order not found" });
    }

    // Fetch the order details from the Orders collection
    const order = await Order.findById(orderId).populate({
      path: 'orderedItems.product',
      select: 'productName productImage price',
    });

    if (!order) {
      return res.status(404).render('error', { errorMessage: "Order details not found" });
    }

    // Extract relevant details
    const { orderedItems, totalAmount, wallet, finalAmount, address, paymentMethod, status } = order;
// Log each variable to the console
console.log('Ordered Items:', orderedItems);
console.log('Total Items:', orderedItems.length);
console.log('Address:', address);
console.log('Payment Method:', paymentMethod);
console.log('Cart Tax (10%):', totalAmount * 0.1);
console.log('Final Amount:', finalAmount);
console.log('Wallet Deduction:', wallet.used);
console.log('Wallet Balance:', wallet.remaining);
console.log('Order Status:', status);
console.log('Initial Cart Total:', totalAmount);

    res.render('orderDetails', {
      cartItems: orderedItems,
      totalItems: orderedItems.length,
      address,
      paymentMethod,
      cartTax: totalAmount * 0.1, // Assuming 10% tax calculation
      finalAmount,
      walletDeduction: wallet.used,
      walletBalance: wallet.remaining,
      orderStatus: status,
      initialCartTotal: totalAmount
    });

  } catch (error) {
    console.error("Error rendering order confirmation:", error);
    return res.status(500).render('error', { errorMessage: "An error occurred while processing your order." });
  }
};
const confirmCheckout = async (req, res) => {
  try {
      const userId = req.session.user;
      const selectedAddress = req.session.selectedAddress;

      if (!selectedAddress) {
          return res.status(400).send('No address selected');
      }

      const cart = await Cart.findOne({ userId }).populate('items.productId');
      if (!cart || cart.items.length === 0) {
          return res.status(400).send('Your cart is empty');
      }

      const user = await User.findById(userId);
      const walletBalance = user.wallet || 0;

      const cartItems = cart.items.map(item => {
          const product = item.productId;
          if (!product) return null;
          const priceToShow = Math.min(product.salePrice, product.regularPrice);
          return {
              id: product._id,
              name: product.productName,
              image: product.productImage[0],
              regularPrice: product.regularPrice,
              salePrice: product.salePrice,
              price: priceToShow,
              quantity: item.quantity,
              totalPrice: priceToShow * item.quantity,
              stock: product.quantity,
          };
      }).filter(item => item);

      if (cartItems.some(item => item.quantity > item.stock)) {
          return res.status(400).send('Some items in your cart are out of stock');
      }

      const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
      const cartSubtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const taxRate = 0.1;
      const cartTax = cartSubtotal * taxRate;
      const cartTotal = cartSubtotal + cartTax;
let couponDiscount= req.session.couponDiscount;
      let discountedAmount = cartTotal;
      let remainingAmountToPay = discountedAmount;

      if (req.session.couponApplied) {
          remainingAmountToPay = remainingAmountToPay - couponDiscount;
      }

      if (req.session.applyWallet) {
          remainingAmountToPay -= walletBalance;
          walletBalance
      }

      // Debugging Logs
      console.log('Discounted Amount:', discountedAmount);
      console.log('Wallet Balance:', walletBalance);
      console.log('Remaining Amount to Pays:', remainingAmountToPay);
req.session.remainingAmountToPay = remainingAmountToPay;
      res.render('confirmCheckout', {
          selectedAddress,
          cartItems,
          cartSubtotal,
          cartTax,
          cartTotal,
          totalItems,
          discountedAmount,
          walletBalance,
          remainingAmountToPay,
      });
  } catch (error) {
      console.error('Error confirming checkout:', error);
      res.status(500).send('Server error');
  }
};

const returnSingleProduct = async (req, res) => {
  const { productId } = req.params; // Extract product ID from URL params
  const { orderId } = req.query; // Extract order ID from query parameters
  const { reason } = req.body; // Extract reason from the request body

  try {
    // Log inputs for debugging
    console.log('Product ID:', productId);
    console.log('Order ID:', orderId);
    console.log('Reason for return:', reason);

    // Check if reason is provided
    if (!reason || reason.trim() === '') {
      console.error('Return reason is missing or empty.');
      return res.status(400).json({ success: false, message: 'Please provide a reason for the return.' });
    }

    // Fetch the order by ID
    const order = await Order.findById(orderId);

    if (!order) {
      console.error('Order not found for ID:', orderId);
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Find the product in orderedItems
    const item = order.orderedItems.find((item) => item.product.toString() === productId);

    if (!item) {
      console.error('Product not found in ordered items:', productId);
      return res.status(400).json({ success: false, message: 'Product not found in order.' });
    }

    // Validate order status
    console.log('Order Status:', order.status);
    if (order.status !== 'Delivered') {
      console.error('Cannot initiate return. Current order status:', order.status);
      return res.status(400).json({ success: false, message: 'Return can only be initiated for delivered orders.' });
    }

    // Update product status to 'Return Request'
    item.productStatus = 'Return Request';
    console.log(`Updating product ${productId} status to 'Return Request'...`);

    // Wallet refund logic
    const refundAmount = item.price * item.quantity;
    const user = await User.findById(order.userId);

    if (!user) {
      console.error('User not found:', order.userId);
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

   // Refund logic based on payment method
  if (order.paymentMethod === 'Razorpay') {
   
    user.wallet += refundAmount;

    // Log the transaction
    user.transactions.push({
      amount: refundAmount,
      type: 'Refund',
      orderId: order._id,
      status: 'Completed',
    });

    await user.save();
    console.log(`Order ${orderId} cancelled and ₹${refundAmount} refunded to wallet.`);
  } else {
    console.log(`Order ${orderId} cancelled. No wallet refund needed for payment method: ${order.paymentMethod}`);
  }
 
    // Save the order with updated product status
    await order.save();

    console.log('Return request submitted successfully.');
    return res.status(200).json({ success: true, message: 'Return request submitted successfully.' });
  } catch (error) {
    console.error('Error handling return request:', error);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


module.exports = { getPaymentPage, processPayment, confirmOrder, cancelOrder,viewOrder,cancelSpecificItem,returnOrder,couponApply,getconfirmOrder,confirmCheckout,returnSingleProduct};
