const User = require("../../models/userSchema")
const mongoose=require("mongoose")
const bcrypt= require("bcrypt")
const Order=require ("../../models/orderSchema")

const getOrderDetails = async (req, res) => {
    try {
      const orderId = req.params.orderId;
      
      // Fetch order details by orderId from the database
      const order = await Order.findById(orderId).populate("orderedItems.product").exec();
  
      if (!order) {
        // Render a custom 404 page when the order is not found
        return res.render('page-404');  // Assuming 'page-404.ejs' is your custom 404 page
      }
  
      // Render the order detail page and pass the order details to the view
      res.render("OrderDetailsPage", { order });
    } catch (err) {
      console.error(err);
      // Handle any other errors and render the generic error page
      res.render('page-404'); // Redirect or render the error page
    }
  };
  








module.exports={getOrderDetails}