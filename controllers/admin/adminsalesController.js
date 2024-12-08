const Brand=require("../../models/brandSchema")
const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema")
const User=require('../../models/userSchema')
const Order=require ("../../models/orderSchema")
const { format } = require('date-fns');
const moment = require('moment-timezone');
const getAdminSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, period } = req.query;
        let filter = { status: 'Delivered' }; // Only Delivered orders

        const isValidDate = (date) => !isNaN(new Date(date).getTime());

        const today = new Date();
        const todayStart = new Date(today.setHours(0, 0, 0, 0));
        const todayEnd = new Date(today.setHours(23, 59, 59, 999));

        const todayOrders = await Order.countDocuments({
            createdOn: { $gte: todayStart, $lt: todayEnd },
            status: 'Delivered'
        });

        const todayRevenue = await Order.aggregate([
            { $match: { createdOn: { $gte: todayStart, $lt: todayEnd }, status: 'Delivered' } },
            { $group: { _id: null, total: { $sum: "$finalAmount" } } }
        ]);

        if (startDate && endDate) {
            if (isValidDate(startDate) && isValidDate(endDate)) {
                filter.createdOn = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            } else {
                return res.status(400).send('Invalid date range provided.');
            }
        } else if (period) {
            const now = new Date();
            let calculatedStartDate, calculatedEndDate;

            if (period === 'last30Days') {
                calculatedStartDate = new Date();
                calculatedStartDate.setDate(now.getDate() - 30);
                calculatedEndDate = now;
            } else if (period === 'last7Days') {
                calculatedStartDate = new Date();
                calculatedStartDate.setDate(now.getDate() - 7);
                calculatedEndDate = now;
            } else if (period === 'lastWeek') {
                calculatedStartDate = new Date();
                calculatedStartDate.setDate(now.getDate() - now.getDay() - 7);
                calculatedEndDate = new Date();
                calculatedEndDate.setDate(now.getDate() - now.getDay());
            }

            if (calculatedStartDate && calculatedEndDate) {
                filter.createdOn = {
                    $gte: calculatedStartDate,
                    $lte: calculatedEndDate
                };
            }
        }

       // Fetch orders based on the filter
const orders = await Order.find({ ...filter, status: 'Delivered' });

const totalOrders = orders.length;
const totalSales = orders.reduce((sum, order) => sum + (order.finalAmount || 0), 0);
        const totalDiscount = orders.reduce((sum, order) => sum + (order.coupon?.discount || 0), 0);

        // Pie Chart: Orders by Payment Method
        const paymentMethodCounts = await Order.aggregate([
            { $match: filter },
            { $group: { _id: "$paymentMethod", count: { $sum: 1 } } }
        ]);

        res.render('sales', {
            report: { orders, totalOrders, totalSales, totalDiscount },
            startDate: startDate || '',
            endDate: endDate || '',
            period: period || '',
            todayRevenue: todayRevenue[0]?.total || 0,
            todayOrders,
            paymentMethodCounts
        });
    } catch (err) {
        console.error('Error fetching sales report:', err);
        res.status(500).send('An error occurred while fetching the sales report. Please try again later.');
    }
};

// = async (req, res) => {
//     try {
//       const { start: startDateQuery, end: endDateQuery, filter = "" } = req.query;
  
//       // Default date range: last 7 days
//       let start = new Date(new Date().setDate(new Date().getDate() - 7));
//       let end = new Date();
  
//       if (startDateQuery) start = new Date(startDateQuery);
//       if (endDateQuery) end = new Date(endDateQuery);
  
//       // Ensure start and end have proper time boundaries
//       start.setHours(0, 0, 0, 0);
//       end.setHours(23, 59, 59, 999);
  
//       // Fetch delivered orders within the date range
//       const deliveredOrders = await Order.find({
//         status: "Delivered",
//         createdOn: { $gte: start, $lte: end },
//       }).lean();
//       const totalOrders = await Order.countDocuments();
//       const todayOrders = await Order.countDocuments({ createdOn: { $gte: new Date().setHours(0, 0, 0, 0) } });
  
//       // Calculate the percentage
//       const ordersPercentage = (todayOrders / totalOrders) * 100;
//       // Calculate total sales count and sum
//       const salesCount = deliveredOrders.length;
//       const salesSum = deliveredOrders.reduce((acc, order) => acc + order.total, 0);
  
//       // Count unique users
//       const userCount = await Order.distinct("userId", {
//         status: "Delivered",
//         createdOn: { $gte: start, $lte: end },
//       }).then((users) => users.length);
  
//       // Format `createdOn` for each order
//       deliveredOrders.forEach((order) => {
//         order.createdOn = order.createdOn.toLocaleDateString();
//       });
  
//       const formattedStart = format(start, 'yyyy-MM-dd');
//       const formattedEnd = format(end, 'yyyy-MM-dd');
  
//       // Calculate daily sales data for the last 7 days
//       const salesData = [];
//       for (let i = 0; i < 7; i++) {
//         const date = new Date();
//         date.setDate(date.getDate() - i);
//         const dayStart = new Date(date.setHours(0, 0, 0, 0));
//         const dayEnd = new Date(date.setHours(23, 59, 59, 999));
  
//         const dailySales = await Order.aggregate([ 
//           { 
//             $match: { 
//               status: "Delivered", 
//               createdOn: { $gte: dayStart, $lte: dayEnd } 
//             } 
//           },
//           { 
//             $group: { 
//               _id: null, 
//               totalSales: { $sum: "$total" } 
//             } 
//           },
//         ]);
  
//         salesData.push({
//           date: format(dayStart, 'yyyy-MM-dd'),
//           sales: dailySales.length ? dailySales[0].totalSales : 0,
//           fillPercentage: Math.min(dailySales.length ? (dailySales[0].totalSales / salesSum) * 100 : 0, 100),
//         });
//       }
  
//       // Best-selling products (example - adjust as needed)
//       const bestSellingProducts = await Order.aggregate([
//         { $match: { status: "Delivered" } },
//         { $unwind: "$items" },
//         { $group: { _id: "$items.productId", totalUnits: { $sum: "$items.quantity" }, totalRevenue: { $sum: "$items.total" } } },
//         { $sort: { totalRevenue: -1 } },
//         { $limit: 5 },
//         {
//           $lookup: {
//             from: "products",
//             localField: "_id",
//             foreignField: "_id",
//             as: "productInfo",
//           },
//         },
//         { $unwind: "$productInfo" },
//         {
//           $project: {
//             name: "$productInfo.name",
//             unitsSold: "$totalUnits",
//             revenue: "$totalRevenue",
//           },
//         },
//       ]);
  
//       const revenueAmount = salesSum;
//       const revenuePercentage = (revenueAmount / salesSum) * 100;
//       const ordersCount = salesCount;
//       const ordersChange = salesCount - deliveredOrders.length;
//       const revenueChange = salesSum - deliveredOrders.reduce((acc, order) => acc + order.total, 0);
//       const avgOrderValue = salesSum / salesCount;
//       const avgOrderValueChange = avgOrderValue - (deliveredOrders.reduce((acc, order) => acc + order.total, 0) / deliveredOrders.length);
  
//       // Calculate avgOrderValuePercentage
//       const targetAvgOrderValue = 1000; // Example target value
//       const avgOrderValuePercentage = (avgOrderValue / targetAvgOrderValue) * 100;
  
//       // Render the report
//       res.render("sales", {
//         userCount,
//         salesCount,
//         salesSum,
//         deliveredOrders,
//         formattedStart,
//         formattedEnd,
//         revenueAmount,
//         revenuePercentage,
//         revenueFormatted: revenueAmount.toLocaleString("en-IN", { style: "currency", currency: "INR" }),
//         revenueChange: revenueChange.toLocaleString("en-IN", { style: "currency", currency: "INR" }),
//         ordersCount,
//         ordersChange,
//         avgOrderValue,
//         avgOrderValueChange,
//         avgOrderValuePercentage,  // Pass this value to the view
//         salesData,
//         bestSellingProducts,
//         ordersPercentage, 
//         ordersCount: todayOrders
//       });
//     } catch (error) {
//       console.error("Error fetching sales report:", error);
//       res.redirect("/pageerror");
//     }
//   };
  const getTodaysRevenue = async (req, res) => {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    // Calculate start and end of yesterday
    const startOfYesterday = new Date(startOfDay);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(endOfDay);
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);

    try {
        // Fetch today's orders excluding canceled ones
        const todaysOrders = await Order.find({
            createdOn: { $gte: startOfDay, $lte: endOfDay },
            status: { $ne: 'Cancelled' }
        });

        const todaysRevenue = todaysOrders.reduce((sum, order) => sum + order.finalAmount, 0);

        // Fetch yesterday's orders excluding canceled ones
        const yesterdaysOrders = await Order.find({
            createdOn: { $gte: startOfYesterday, $lte: endOfYesterday },
            status: { $ne: 'Cancelled' }
        });

        const yesterdaysRevenue = yesterdaysOrders.reduce((sum, order) => sum + order.finalAmount, 0);

        // Optionally calculate the revenue change percentage
        const revenueChange = ((todaysRevenue - yesterdaysRevenue) / (yesterdaysRevenue || 1)) * 100;

        // Ensure correct currency format before sending the response
        res.json({ 
            todaysRevenue: todaysRevenue.toFixed(2), 
            yesterdaysRevenue: yesterdaysRevenue.toFixed(2), 
            revenueChange: revenueChange.toFixed(2) + "%" 
        });
    } catch (error) {
        console.error('Error fetching revenue data:', error.stack);
        res.status(500).json({ message: 'Server Error' });
    }
};

const getTodaysOrders = async (req, res) => {
  const startOfToday = moment().tz('Asia/Kolkata').startOf('day').toDate();
  const endOfToday = moment().tz('Asia/Kolkata').endOf('day').toDate();
  
  const startOfYesterday = moment().tz('Asia/Kolkata').subtract(1, 'days').startOf('day').toDate();
  const endOfYesterday = moment().tz('Asia/Kolkata').subtract(1, 'days').endOf('day').toDate();
  
  try {
    const todaysOrders = await Order.find({ createdOn: { $gte: startOfToday, $lte: endOfToday } });
    const yesterdaysOrders = await Order.find({ createdOn: { $gte: startOfYesterday, $lte: endOfYesterday } });
    
    res.json({
      todaysOrders: todaysOrders.length,
      yesterdaysOrders: yesterdaysOrders.length,
    });
  } catch (error) {
    console.error('Error fetching today\'s orders:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
// const getAvgOrderValue = async (req, res) => {
//   const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
//   const endOfToday = new Date(new Date().setHours(23, 59, 59, 999));

//   const startOfYesterday = new Date(new Date().setDate(new Date().getDate() - 1));
//   const endOfYesterday = new Date(new Date(startOfYesterday).setHours(23, 59, 59, 999)); // Adjust to the last moment of yesterday

//   try {
//       console.log("Start of Today: ", startOfToday);
//       console.log("End of Today: ", endOfToday);
//       console.log("Start of Yesterday: ", startOfYesterday);
//       console.log("End of Yesterday: ", endOfYesterday);

//       // Calculate today's average order value
//       const todayOrders = await Order.find({
//           createdOn: { $gte: startOfToday, $lte: endOfToday },
//       });
//       console.log("Today's Orders: ", todayOrders); // Debugging

//       const todayTotalRevenue = todayOrders.reduce((acc, order) => acc + order.finalAmount, 0);
//       console.log("Today's Total Revenue: ", todayTotalRevenue); // Debugging

//       const todayAvgOrderValue = todayOrders.length ? (todayTotalRevenue / todayOrders.length) : 0;
//       console.log("Today's Average Order Value: ", todayAvgOrderValue); // Debugging

//       // Calculate yesterday's average order value
//       const yesterdayOrders = await Order.find({
//           createdOn: { $gte: startOfYesterday, $lte: endOfYesterday }, // Fixed the range
//       });
//       console.log("Yesterday's Orders: ", yesterdayOrders); // Debugging

//       const yesterdayTotalRevenue = yesterdayOrders.reduce((acc, order) => acc + order.finalAmount, 0);
//       console.log("Yesterday's Total Revenue: ", yesterdayTotalRevenue); // Debugging

//       const yesterdayAvgOrderValue = yesterdayOrders.length ? (yesterdayTotalRevenue / yesterdayOrders.length) : 0;
//       console.log("Yesterday's Average Order Value: ", yesterdayAvgOrderValue); // Debugging

//       // Send the data in the response
//       res.json({ todayAvgOrderValue, yesterdayAvgOrderValue });
//   } catch (error) {
//       console.error('Error fetching average order value:', error);
//       res.status(500).json({ message: 'Server Error' });
//   }
// };


// const getsevendaysReport = async (req, res) => {
//   try {
//     const today = new Date();
//     today.setHours(0, 0, 0, 0); // Set to start of the day
//     const sevenDaysAgo = new Date();
//     sevenDaysAgo.setDate(today.getDate() - 6);
//     sevenDaysAgo.setHours(0, 0, 0, 0);

//     const salesData = await Order.aggregate([
//       {
//         $match: {
//           createdAt: { $gte: sevenDaysAgo, $lte: today },
//         },
//       },
//       {
//         $group: {
//           _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
//           totalSales: { $sum: "$finalAmount" },
//         },
//       },
//       { $sort: { _id: 1 } },
//     ]);

//     // Generate dates for the past 7 days
//     const dates = Array.from({ length: 7 }, (_, i) => {
//       const date = new Date();
//       date.setDate(today.getDate() - i);
//       return date.toISOString().split("T")[0];
//     }).reverse();

//     // Fill missing dates with zero sales
//     const formattedSalesData = dates.map(date => ({
//       date,
//       amount: salesData.find(sale => sale._id === date)?.totalSales || 0,
//     }));

//     res.json(formattedSalesData);
//   } catch (err) {
//     console.error("Error fetching sales data:", err);
//     res.status(500).json({ error: "Failed to fetch sales data" });
//   }
// };

module.exports ={getAdminSalesReport, getTodaysOrders,getTodaysRevenue}
