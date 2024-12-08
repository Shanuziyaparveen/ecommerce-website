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



router.get("/pageerror",adminController.pageerror);

router.get("/login",adminController.loadLogin);
router.post("/login",adminController.login)
router.get("/",adminAuth,adminController.loadDashboard)
router.get("/logout",adminController.logout)
router.get("/users",adminAuth,customerController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth,customerController.customerunBlocked);
router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",adminAuth,categoryController.addCategory);
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);

router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffers)
router.get("/listCategory",adminAuth,categoryController.getListCategory)
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory)
router.post("/editCategory/:id",adminAuth,categoryController.editCategory);
router.get("/brands",adminAuth,brandController.getBrandPage)
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand);
router.get("/blockBrand",adminAuth,brandController.blockBrand)
router.get("/unBlockBrand",adminAuth,brandController.unBlockBrand)
router.get("/editBrand/:id", adminAuth, brandController.editBrand);
router.post("/editBrand/:id", adminAuth,uploads.single('image'), brandController.updateBrand);

router.get("/addProducts",adminAuth,productController.getProductAddPage)
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts);
router.get("/products",adminAuth,productController.getAllProducts);
router.post("/addProductOffer",adminAuth,productController.addProductOffer)
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer)
router.get("/blockProduct",adminAuth,productController.blockProduct);

router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array("images",4),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage);


// banner management 
router.get("/banner",adminAuth,bannerController.getBannerPage);
router.get("/addBanner",adminAuth,bannerController.getAddBannerPage)
router.post("/addBanner",adminAuth,uploads.single("images"),bannerController.addBanner)
router.get("/deleteBanner",adminAuth,bannerController.deleteBanner);



// Route to get the order list
router.get('/orderList', adminController.getOrderList);

// Route to update the order status
router.post('/updateOrderStatus', adminController.updateOrderStatus);
router.put('/updateProductStatus', adminController.updateProductStatus);

router.get("/orderDetails/:orderId", orderController.getOrderDetails);
//sales management
router.get('/sales', adminsalesController.getAdminSalesReport)


router.get('/revenue/today',adminsalesController.getTodaysRevenue);

router.get('/orders/today',adminsalesController.getTodaysOrders);

//coupon management


router.get('/add-coupon', couponController.getaddcoupon)
router.post('/add-coupon', couponController.addCoupon)
router.get('/coupon', couponController.getCoupon)
router.get("/delete-coupon/:id", couponController.deleteCoupon)
router.get("/edit-coupon/:id", couponController.getEditCoupon)
router.post("/edit-coupon", couponController.editCoupon)



module.exports=router