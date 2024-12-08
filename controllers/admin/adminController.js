const User = require("../../models/userSchema")
const mongoose=require("mongoose")
const bcrypt= require("bcrypt")
const Order=require ("../../models/orderSchema")

const pageerror= async(req,res)=>{
    res.render("admin-error")
}

const loadLogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }
    res.render("admin-login",{message:null})
}
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                req.session.admin = true;
                return res.redirect("/admin");
            } else {
                // Redirect to login page if password doesn't match
                return res.redirect("/login");
            }
        } else {
            // Redirect if no admin found
            return res.redirect("/login");
        }
    } catch (error) {
        console.log('login error', error);
        return res.redirect("/pageerror");
    }
};
const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            return res.render("dashboard"); // Ensure "dashboard" exists in "views/admin"
        } catch (error) {
            console.error('Dashboard load error:', error);
            return res.redirect("/pageerror");
        }
    } else {
        return res.redirect("/admin/login");
    }
};


const logout=async(req,res)=>{
    try{
        req.session.destroy((err)=>{
            if(err){
                console.log('session destruction error',err.message);
                return res.redirect("/pageNotFound")
            }
            return res.redirect("/admin/login")
        })
    }catch(error){
        console.log('logout error',error);
       response.redirect("/pageerror")
    }
}
// const getProductDetail =async  (req, res, next) => {
//     Product.findById(req.params.prodId)
//         .then(product => {
//             console.log('prodcut: ', product);
//             res.render('product-detail', { prod: product, pageTitle: 'Product Detail', path: '/', name: 'Edward' });
//         })
//         .catch(err => console.log(err));
// }
const getOrderList = async (req, res) => {
  try {
    const perPage = 10; // Number of orders per page
    const page = parseInt(req.query.page) || 1; // Current page, default to 1

    // Fetch paginated orders with total count
    const [orders, totalOrders] = await Promise.all([
      Order.find()
        .populate('userId', 'name email')
        .populate('orderedItems.product', 'productName')
        .sort({ createdOn: -1 })
        .skip((page - 1) * perPage) // Skip orders for previous pages
        .limit(perPage), // Limit to perPage orders
      Order.countDocuments() // Count total orders
    ]);

    const statusMap = {
      Pending: 'Order Placed',
      Processing: 'Processing',
      Shipped: 'Shipped',
      Delivered: 'Delivered',
      Cancelled: 'Order Cancelled',
      'Return Request': 'Return Requested',
      Returned: 'Returned',
    };

    const updatedOrders = orders.map(order => ({
      ...order._doc,
      displayStatus: statusMap[order.status] || 'Unknown',
      orderedItems: order.orderedItems.map(item => ({
        ...item._doc,
        productStatus: statusMap[item.productStatus] || 'Unknown',
      }))
    }));

    // Calculate total pages
    const totalPages = Math.ceil(totalOrders / perPage);

    // Render the paginated data
    res.render('orderList', {
      orders: updatedOrders,
      currentPage: page,
      totalPages,
    });
  } catch (error) {
    console.error('Error fetching order list:', error);
    res.redirect('errorPage');
  }
};

  const updateOrderStatus = async (req, res) => {
    try {
      const { orderId, status } = req.body;
  
      // Prepare the fields to be updated
      let updateFields = { status };
  
      // Update timestamps based on the order status
      if (status === 'Ordered') {
        updateFields.ordered = new Date();
      } else if (status === 'Shipped') {
        updateFields.shipped = new Date();
      } else if (status === 'Delivered') {
        updateFields.delivered = new Date();
      }
  
      // Update the order status in the database
      const updatedOrder = await Order.findByIdAndUpdate(orderId, updateFields, { new: true });
  
      // If the order exists, update all the products' statuses to match the order status
      if (updatedOrder) {
        // Update productStatus for each ordered item
        updatedOrder.orderedItems.forEach(item => {
          item.productStatus = status; // Set the product status to match the order status
        });
  
        // Save the updated order with updated product statuses
        await updatedOrder.save();
      }
  
      // Redirect back to the order list page
      res.redirect('orderList');
    } catch (error) {
      console.error('Error updating order status:', error);
      res.redirect('errorPage'); // Redirect to an error page if needed
    }
  };
  const updateProductStatus = async (req, res) => {
    const { orderId, productId, productStatus } = req.body;
  
    try {
      // Fetch the order by ID
      const order = await Order.findById(orderId);
  
      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
  
      // Find the product item to be updated
      const itemIndex = order.orderedItems.findIndex(item => item.product._id.toString() === productId);
  
      if (itemIndex === -1) {
        return res.status(404).json({ success: false, message: 'Product not found in order' });
      }
  
      // Update the product status
      order.orderedItems[itemIndex].productStatus = productStatus;
  
      // If there is only one item in the order, the productStatus becomes the order status
      if (order.orderedItems.length === 1) {
        order.status = productStatus;  // set order status to productStatus
      } else {
        // If all products in the order have the same status, set order status to that status
        const allSameStatus = order.orderedItems.every(item => item.productStatus === productStatus);
        if (allSameStatus) {
          order.status = productStatus;
        }
      }
  
      // Save the updated order
      await order.save();
  
      return res.json({ success: true, message: 'Product status updated successfully' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Error updating product status' });
    }
  };
  
  
module.exports={
    loadLogin,login,loadDashboard,pageerror,logout,getOrderList,updateOrderStatus, updateProductStatus
  
}