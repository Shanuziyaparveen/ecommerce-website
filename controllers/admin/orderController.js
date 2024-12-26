const User = require("../../models/userSchema")
const mongoose=require("mongoose")
const bcrypt= require("bcrypt")
const Order=require ("../../models/orderSchema")
const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // Fetch order details and populate the product data
    const order = await Order.findById(orderId)
      .populate('orderedItems.product')
      .exec();

    if (!order) {
      return res.render('page-404'); // Custom 404 page if order not found
    }

     // Calculate total discount and wallet amount
     const discount = order.discount || (order.coupon && order.coupon.discount) || 0;
     const walletAmount = order.wallet.used || 0;
    // Render the order details page and pass the variables to EJS
    res.render('orderDetailsPage', {
      order,
      discount,
      walletAmount
    });
  } catch (err) {
    console.error('Error fetching order details:', err);
    res.render('page-404'); // Generic error page in case of an error
  }
};





module.exports={getOrderDetails,}