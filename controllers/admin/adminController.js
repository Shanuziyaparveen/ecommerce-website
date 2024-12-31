const User = require("../../models/userSchema")
const mongoose=require("mongoose")
const bcrypt= require("bcrypt")
const Order=require ("../../models/orderSchema")

const pageerror= async(req,res)=>{
  const errorMessage = "Something went wrong. Please try again.";
  res.render("admin-error", { errorMessage });
   
}

const loadLogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin")
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
                return res.redirect("/admin/login");
            }
        } else {
            // Redirect if no admin found
            return res.redirect("/admin/login");
        }
    } catch (error) {
        console.log('login error', error);
        return res.redirect("/pageerror");
    }
};
const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            // Fetch top 10 best-selling products
            const bestSellingProducts = await Order.aggregate([
                { $unwind: "$orderedItems" }, // Deconstruct the orderedItems array
                {
                    $group: {
                        _id: "$orderedItems.product", // Group by product ID
                        totalSales: { $sum: "$orderedItems.quantity" }, // Sum the quantities sold
                    }
                },
                {
                    $lookup: {
                        from: "products", // Match with the Products collection
                        localField: "_id", // Product ID
                        foreignField: "_id", // ID in Products collection
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" }, // Deconstruct product details array
                {
                  $project: {
                    _id: 0,
                    name: "$productDetails.name",
                    sales: "$totalSales",
                    salePrice: "$productDetails.salePrice",
                    regularPrice: "$productDetails.regularPrice",
                    category: "$productDetails.category",
                    productName: "$productDetails.productName",
                    productImage: "$productDetails.productImage" // Include productImage
                }
                },
                { $sort: { sales: -1 } }, // Sort by sales in descending order
                { $limit: 10 } // Limit to top 10 products
            ]);
            const monthlyOrdersData = await Order.aggregate([
              {
                  $group: {
                      _id: {
                          month: { $month: "$createdOn" },
                          status: "$status"
                      },
                      count: { $sum: 1 }
                  }
              },
              {
                  $group: {
                      _id: "$_id.month",
                      statuses: {
                          $push: {
                              status: "$_id.status",
                              count: "$count"
                          }
                      }
                  }
              },
              { $sort: { "_id": 1 } }
          ]);
          
          const yearlyOrdersData = await Order.aggregate([
              {
                  $group: {
                      _id: {
                          year: { $year: "$createdOn" },
                          status: "$status"
                      },
                      count: { $sum: 1 }
                  }
              },
              {
                  $group: {
                      _id: "$_id.year",
                      statuses: {
                          $push: {
                              status: "$_id.status",
                              count: "$count"
                          }
                      }
                  }
              },
              { $sort: { "_id": 1 } }
          ]);
          
          // Prepare data for frontend
          const months = Array.from({ length: 12 }, (_, i) => i + 1); // January to December
          const monthlyData = months.map(month => {
              const monthData = monthlyOrdersData.find(item => item._id === month);
              return {
                  month,
                  statuses: monthData ? monthData.statuses : []
              };
          });
          
          const yearlyData = yearlyOrdersData.map(item => ({
              year: item._id,
              statuses: item.statuses
          }));
          // If no data, set default empty values (for new website)
          if (yearlyData.length === 0) {
              yearlyData.push({ year: new Date().getFullYear(), sales: 0 });
          }
          if (monthlyData.length === 0) {
              monthlyData.push({ month: new Date().getMonth() + 1, sales: 0 });
          }
          
            // Fetch top 10 best-selling categories
            const bestSellingCategories = await Order.aggregate([
                { $unwind: "$orderedItems" },
                {
                    $lookup: {
                        from: "products",
                        localField: "orderedItems.product",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" },
                {
                    $group: {
                        _id: "$productDetails.category", // Group by category
                        totalSales: { $sum: "$orderedItems.quantity" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: "$_id", // Category name
                        sales: "$totalSales"
                    }
                },
                { $sort: { sales: -1 } },
                { $limit: 10 }
            ]);

            // Fetch top 10 best-selling brands
            const bestSellingBrands = await Order.aggregate([
                { $unwind: "$orderedItems" },
                {
                    $lookup: {
                        from: "products",
                        localField: "orderedItems.product",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                { $unwind: "$productDetails" },
                {
                    $group: {
                        _id: "$productDetails.brand", // Group by brand
                        totalSales: { $sum: "$orderedItems.quantity" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        name: "$_id", // Brand name
                        sales: "$totalSales"
                    }
                },
                { $sort: { sales: -1 } },
                { $limit: 10 }
            ]);

            // Render the dashboard with the data
            return res.render('dashboard', {
                bestSellingProducts,
                bestSellingCategories,
                bestSellingBrands,
                yearlyData, // Pass the yearly sales data
                monthlyData  // Pass the monthly sales data
            });
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
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
    const perPage = 9; // Number of orders per page
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
        'Payment Pending':'payment not completed',
        Pending:"Ordered",
      Placed: 'Order Placed',
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