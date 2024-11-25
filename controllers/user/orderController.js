const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");

const getPaymentPage = async (req, res) => {
  try {
    res.render('payment', {
      pageTitle: 'Select Payment Method',
      availableMethods: ['Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'COD'] // Available payment methods
    });
  } catch (error) {
    console.error('Error rendering payment page:', error);
    res.status(500). render('error', { errorMessage: 'Server Error'});
  }
};
const processPayment = async (req, res) => {
  try {
    const { paymentMethod } = req.body;
    const userId = req.session.user._id;
    
    // Log session and payment method for debugging
    console.log('Session:', req.session);
    console.log('Received payment method:', paymentMethod);
    console.log('User ID:', userId);

    // Ensure the user is logged in
    if (!userId) {
      return res.status(401). render('error', { errorMessage: "User not logged in"});
    }

    // Fetch the cart from the database using the userId
    let cart = await Cart.findOne({ userId }).populate("items.productId");

    // Log the fetched cart
    console.log('Cart fetched from database:', cart);

    if (!cart || cart.items.length === 0) {
      console.log('Invalid payment method or empty cart:', { paymentMethod, cart });
      return res.status(400). render('error', { errorMessage: "Invalid payment method or empty cart"});
    }
  // Get the address from session instead of querying the database
  const selectedAddress = req.session.selectedAddress;

  // Check if the selected address exists in the session
  if (!selectedAddress) {
    console.log('Selected address not found in session');
    return res.status(400). render('error', { errorMessage: "Address not selected or not found"});
  }

  // Log the user's address for debugging
  console.log('Selected address:', selectedAddress);

    // Handle payment methods
    if (paymentMethod === 'COD') {
      // Process Cash on Delivery (COD) logic here
      console.log("Cash on Delivery selected");
      // Additional COD processing code here, such as updating order status
    } else if (paymentMethod === 'OnlinePayment') {
      // Handle online payment logic here
      console.log("Online payment selected");
      // Online payment gateway integration (e.g., Razorpay) goes here
    } else {
      return res.status(400). render('error', { errorMessage: "Invalid payment method selected"});
    }
    req.session.paymentMethod = paymentMethod;
    // Render the order confirmation page with the necessary details
    res.render("confirmOrder", {
      paymentMethod,
      cart,
      address:selectedAddress,
      totalAmount: cart.cartTotal,
    });

  } catch (error) {
    // Log the error for debugging
    console.error("Error processing payment:", error);
    res.status(500). render('error', { errorMessage: "An error occurred while processing your payment."});
  }
};
const confirmOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;  // Get user ID from the session
    if (!userId) {
      return res.status(401). render('error', { errorMessage: "User not logged in"});
    }

    // Debugging: Log userId from session
    console.log("Session User ID:", userId);

    // Fetch the user's cart details from the Cart collection and populate productId details
    let cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'productName productImage',
    });

    // Debugging: Log the fetched cart
    console.log("Fetched Cart:", cart);

    // Check if cart exists and has items
    if (!cart || cart.items.length === 0) {
      return res.status(400). render('error', { errorMessage: "Your cart is empty"});
    }

    // Log the items in the cart
    console.log("Cart Items:", cart.items);
    
    // Check that items are properly populated with product details
    if (cart.items.some(item => !item.productId)) {
      return res.status(400). render('error', { errorMessage: "Some items in the cart are missing product details."});
    }

    // Fetch the selected address from the session (assuming the address was saved in the session during checkout)
    const selectedAddress = req.session.selectedAddress;
    if (!selectedAddress) {
      return res.status(400). render('error', { errorMessage: "Address not selected or not found"});
    }

    // Debugging: Log selected address
    console.log("Selected Address:", selectedAddress);

    const paymentMethod = req.session.paymentMethod;
    if (!paymentMethod) {
      return res.status(400).send("Payment method not provided");
    }

    // Debugging: Log payment method
    console.log("Payment Method:", paymentMethod);

    // Fetch the cartTotal directly from the cart document
    const cartTotal = cart.cartTotal;

    // Check if cartTotal is valid
    if (isNaN(cartTotal) || cartTotal <= 0) {
      return res.status(400). render('error', { errorMessage: "Invalid cart total."});
    }

    // Debugging: Log the cart total
    console.log("Cart Total:", cartTotal);

  // Prepare orderData to be saved in the Order collection
 const orderData = {
  userId: userId,
  orderedItems: cart.items.map(item => ({
    product: item.productId._id, // Assuming productId is populated, use _id
    quantity: item.quantity,
    price: item.price,
  })),
  address: selectedAddress,
  paymentMethod: paymentMethod,
  finalAmount: cartTotal, // Assuming the final amount is the same as cart total, adjust if needed
  discount: 0, // Add any discount logic if necessary
  status:'Pending',
  createdAt: new Date(),
  dates:{
    ordered: new Date(), // Add the current date as the ordered date
  },
};

  
  // Now save the orderData with populated 'orderedItems' array
  const order = new Order(orderData);
  await order.save(); // Ensure you await the save to handle the async operation properly


  for (const item of cart.items) {
    const product = await Product.findById(item.productId._id); // Ensure _id is correctly used
    if (product) {
      // Subtract the quantity ordered from the product's available stock
      product.quantity -= item.quantity;
      await product.save(); // Save the updated product stock
    }
  }
  // Optionally, clear the cart after the order is placed
  await Cart.updateOne({ userId }, { $set: { items: [] } });  // Clear the cart (or update as needed)

  // Log the cleared cart
  console.log("Cart after order placed:", cart);

  // Render the order details page with the cart, address, and payment method
  res.render('orderDetails', {
    cartItems: cart.items,
    totalItems: cart.items.length,
    address: selectedAddress,
    paymentMethod,
    cartTotal,
  });
} catch (error) {
  // Handle any potential errors
  console.error("Error rendering order confirmation:", error);
        return res.status(400).render('error', { errorMessage: "An error occurred while loading your order details."});
}
};


const cancelOrder=async (req,res)=>{
  try {
    const orderId = req.query.id; // Get the order ID from the query parameters

    // Find the order and update the status to 'Cancelled'
    const order = await Order.findById(orderId);
    if (!order) {
      console.error('Order not found');
      return res.redirect('/userProfile'); // Redirect to profile if order not found
    }

    // Check if the order is already cancelled
    if (order.status === 'Cancelled') {
      console.error('Order is already cancelled');
      return res.redirect('/userProfile'); // Redirect to profile if order is already cancelled
    }

    // Update the status to 'Cancelled'
    order.status = 'Cancelled';
    await order.save();

    res.redirect('/userProfile'); // Redirect back to the profile page after cancelling the order
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.redirect('/pageNotFound'); // Redirect to profile page in case of an error
  }
}
const viewOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      console.error('Order ID is missing in the request.');
      return res.status(400).render('error', { errorMessage: 'Invalid Order Request!' });
    }

    // Fetch the order by ID and populate the necessary fields, including image
    const order = await Order.findById(id)
      .populate('orderedItems.product', 'productName salePrice regularPrice productImage'); // Added 'image' field here

    if (!order) {
      console.error(`Order with ID ${id} not found.`);
      return res.status(404).render('error', { errorMessage: 'Order not found!' });
    }

    // Pass address explicitly if you want to access it as 'address' in EJS
    res.render('viewOrderDetails', { order, address: order.address });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.redirect('/pageNotFound'); // Redirect to a 404 or error page
  }
};
const cancelSpecificItem = async (req, res) => {
  const productId = req.params.id;
  const orderId = req.query.orderId;
  try {
    // Update the specific product's status to "Cancelled"
    await Order.updateOne(
      { _id: orderId, "orderedItems.product": productId },
      { $set: { "orderedItems.$.productStatus": "Cancelled" } }
    );
  
    // Fetch the updated order details
    const updatedOrder = await Order.findById(orderId).populate('orderedItems.product');  // populate products to get more details
  
    // Check if the order contains only one item
    if (updatedOrder.orderedItems.length === 1) {
      // If there's only one item, and it's cancelled, update the order status to "Cancelled"
      if (updatedOrder.orderedItems[0].productStatus === 'Cancelled') {
        await Order.updateOne({ _id: orderId }, { status: "Cancelled" });
        updatedOrder.status = "Cancelled";  // Reflect this in the response
      }
    } else {
      // For multiple items, check if all are cancelled
      const allCancelled = updatedOrder.orderedItems.every(item => item.productStatus === 'Cancelled');
      
      if (allCancelled) {
        // If all items are cancelled, update the order status to "Cancelled"
        await Order.updateOne({ _id: orderId }, { status: "Cancelled" });
        updatedOrder.status = "Cancelled";  // Reflect this in the response
      } else {
        // If any product is still active, set the order status to "Pending"
        await Order.updateOne({ _id: orderId }, { status: "Pending" });
        updatedOrder.status = "Pending";  // Reflect this in the response
      }
    }
  
    // Respond with the updated order details
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Error canceling product:", error);
  
    // Respond with an error message if something goes wrong
    res.status(500).json({ success: false, message: "Failed to cancel the product." });
  }
}
const returnOrder = async (req, res) => {
  try {
    const orderId = req.query.id;

    // Find the order by ID
    const order = await Order.findById(orderId);

    // If order not found
    if (!order) {
      req.flash('error', 'Order not found');
      return res.redirect('/userProfile#orders');  // Redirect to orders tab in profile
    }

    // Check if the order status is 'Delivered'
    if (order.status !== 'Delivered') {
      req.flash('error', 'Only delivered orders can have return requests');
      return res.redirect('/userProfile#orders');  // Redirect to orders tab in profile
    }

    // Update order status to 'Return Request'
    order.status = 'Return Request';
    await order.save();

    req.flash('success', 'Return request initiated successfully');
    res.redirect('/userProfile#orders');  // Redirect to orders tab in profile
  } catch (err) {
    console.error('Error while processing return request:', err);
    req.flash('error', 'An error occurred while processing the return request');
    res.redirect('/userProfile#orders');  // Redirect to orders tab in profile
  }
};


module.exports = { getPaymentPage, processPayment, confirmOrder, cancelOrder,viewOrder,cancelSpecificItem,returnOrder};
