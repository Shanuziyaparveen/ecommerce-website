const express=require("express")
const router=express.Router();
const adminController=require("../controllers/admin/adminController")
const {userAuth,adminAuth}=require("../middlewares/auth");
const customerController=require("../controllers/admin/customerController")
const categoryController=require("../controllers/admin/categoryController")
const brandController=require("../controllers/admin/brandController")
const productController=require("../controllers/admin/productController");
const bannerController=require("../controllers/admin/bannerController")
const orderController=require("../controllers/admin/orderController")
const adminsalesController=require("../controllers/admin/adminsalesController")
const couponController=require("../controllers/admin/couponController")
const multer=require("multer");
const storage=require("../helpers/multer");
const uploads=multer({storage:storage});

// Page Error Route
router.get("/pageerror", adminController.pageerror);

// Login and Logout Routes
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/logout", adminController.logout);

// Dashboard Route
router.get("/", adminAuth, adminController.loadDashboard);

// Customer Management Routes
router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked);

// Category Management Routes
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post("/addCategoryOffer", adminAuth, categoryController.addCategoryOffer);
router.post("/removeCategoryOffer", adminAuth, categoryController.removeCategoryOffers);
router.get("/listCategory", adminAuth, categoryController.getListCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth, categoryController.editCategory);

// Brand Management Routes
router.get("/brands", adminAuth, brandController.getBrandPage);
router.post("/addBrand", adminAuth, uploads.single("image"), brandController.addBrand);
router.get("/blockBrand", adminAuth, brandController.blockBrand);
router.get("/unBlockBrand", adminAuth, brandController.unBlockBrand);
router.get("/editBrand/:id", adminAuth, brandController.editBrand);
router.post("/editBrand/:id", adminAuth, uploads.single("image"), brandController.updateBrand);

// Product Management Routes
router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post("/addProducts", adminAuth, uploads.array("images", 4), productController.addProducts);
router.get("/products", adminAuth, productController.getAllProducts);
router.post("/addProductOffer", adminAuth, productController.addProductOffer);
router.post("/removeProductOffer", adminAuth, productController.removeProductOffer);
router.get("/blockProduct", adminAuth, productController.blockProduct);
router.get("/unblockProduct", adminAuth, productController.unblockProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct);
router.post("/editProduct/:id", adminAuth, uploads.array("images", 4), productController.editProduct);
router.post("/deleteImage", adminAuth, productController.deleteSingleImage);

// Banner Management Routes
router.get("/banner", adminAuth, bannerController.getBannerPage);
router.get("/addBanner", adminAuth, bannerController.getAddBannerPage);
router.post("/addBanner", adminAuth, uploads.single("images"), bannerController.addBanner);
router.get("/deleteBanner", adminAuth, bannerController.deleteBanner);

// Order Management Routes
router.get('/orderList', adminController.getOrderList); // Route to get the order list
router.post('/updateOrderStatus', adminController.updateOrderStatus); // Route to update the order status
router.put('/updateProductStatus', adminController.updateProductStatus); // Route to update the product status
router.get('/orderDetails/:orderId', orderController.getOrderDetails); // Route to get order details

// Sales Management Routes
router.get('/sales', adminsalesController.getAdminSalesReport); // Route to get sales report
router.get('/revenue/today', adminsalesController.getTodaysRevenue); // Route to get today's revenue
router.get('/orders/today', adminsalesController.getTodaysOrders); // Route to get today's orders

// Coupon Management Routes
router.get('/add-coupon', couponController.getaddcoupon); // Route to display add coupon page
router.post('/add-coupon', couponController.addCoupon); // Route to add a new coupon
router.get('/coupon', couponController.getCoupon); // Route to get coupon list
router.get('/delete-coupon/:id', couponController.deleteCoupon); // Route to delete a coupon
router.get('/edit-coupon/:id', couponController.getEditCoupon); // Route to display edit coupon page
router.post('/edit-coupon', couponController.editCoupon); // Route to update coupon details



module.exports=router