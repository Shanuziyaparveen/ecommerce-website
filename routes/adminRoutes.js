const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Admin = require("../models/adminModel.js");
const ensureAdminAuthenticated = require("../middlewares/adminMiddleware.js");
const User = require("../models/userModel.js");
const Product = require("../models/productModel.js");
const Order = require("../models/orderModel.js");
const Category = require("../models/categoryModel.js");
const router = express.Router();
const multer = require("multer");
const path = require('path');
const upload = require('../middlewares/multer.js');
const {
  getAllProductsController,
  createProductController,
  postUpdateProduct,
  deleteProductController,
  viewDeletedProductsController,
  addProductReviewController,
  getEditProduct,
} = require('../controllers/productController');

const { body, validationResult } = require('express-validator');

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads"),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

// Middleware to handle errors
const handleErrors = (error, req, res, next) => {
    console.error("Error:", error);
    req.flash("error_msg", "Internal Server Error");
    res.status(500).redirect("/admin");
};



// Admin Sign In Page (GET)
router.get("/signin", (req, res) => {
    res.render("admin/login", { errorMessage: null });
});

// Admin Sign In (POST)
router.post("/signin", async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find admin by username
        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).render("admin/login", { errorMessage: "Invalid username or password" });
        }

        // Compare hashed passwords
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).render("admin/login", { errorMessage: "Invalid username or password" });
        }

        // Generate JWT token for authenticated admin
        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

        // Setting cookie for future authentication
        res.cookie("adminToken", token, { httpOnly: true });
        return res.redirect("/admin/dashboard"); // Redirecting to dashboard on successful login

    } catch (error) {
        console.error("Admin login error:", error);
        return res.status(500).render("admin/login", { errorMessage: "Internal server error" });
    }
});

// Admin Dashboard (GET)
router.get("/dashboard", ensureAdminAuthenticated, async (req, res) => {
    try {
        // Fetch user list
        const userList = await User.find(); // Fetch all users

        // Fetch product count
        const totalProducts = await Product.countDocuments(); // Count all products

        // Fetch order count
        const totalOrders = await Order.countDocuments(); // Count all orders

        // Fetch user count
        const totalUsers = userList.length; // Use the length of userList

        // Render the dashboard with the fetched data
        res.render("admin/dashboard", {
            users: userList,
            productCount: totalProducts,
            orderCount: totalOrders,
            userCount: totalUsers,
        });
    } catch (error) {
        console.error("Error fetching data for dashboard:", error);
        return res.status(500).send("Internal Server Error");
    }
});

// Toggle User Block Status (POST)
router.post("/users/changeBlockStatus/:id", ensureAdminAuthenticated, async (req, res) => {
    try {
        const userId = req.params.id;
        const isBlocked = req.body.isBlocked === "true"; // Convert string to boolean

        // Toggle the `isBlocked` status
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { isBlocked: !isBlocked },
            { new: true } // Return the updated user
        );

        if (!updatedUser) {
            return res.status(404).send("User not found");
        }

        // Show appropriate flash message based on the updated status
        req.flash("success_msg", updatedUser.isBlocked ? "User blocked successfully" : "User unblocked successfully");

        // Redirect back to the user list page
        res.redirect("/admin/users");
    } catch (error) {
        console.error("Error toggling user block status:", error);
        res.status(500).send("Internal server error");
    }
});

// Route to get user list with pagination
router.get("/users", ensureAdminAuthenticated, async (req, res) => {
    const page = parseInt(req.query.page) || 1; // Get the current page from query params, default to 1
    const limit = 5; // Number of users per page

    try {
        const users = await User.find(); // Fetch all users
        const userCount = users.length; // Total number of users
        const paginatedUsers = users.slice((page - 1) * limit, page * limit); // Paginated users

        const totalPages = Math.ceil(userCount / limit); // Calculate total pages

        // Render the user list view with paginated users and userCount
        res.render("admin/userList", {
            users: paginatedUsers,
            userCount,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).send("Internal Server Error");
    }
});

// Route to render Category Management page
router.get("/categories", ensureAdminAuthenticated, async (req, res) => {
    try {
        const categories = await Category.find({ isDeleted: false });
        res.render("admin/categoryManagement", { categories });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send("Server Error");
    }
});

// Route to add a new category
router.post("/categories/add", ensureAdminAuthenticated, async (req, res) => {
    try {
        const newCategory = new Category({ category: req.body.category });
        await newCategory.save();
        req.flash("success_msg", "Category added successfully");
        res.redirect("/admin/categories");
    } catch (error) {
        console.error("Error adding category:", error);
        res.status(500).send("Server Error");
    }
});

// Route to edit a category
router.post("/categories/edit/:id", ensureAdminAuthenticated, async (req, res) => {
    try {
        const categoryId = req.params.id;
        await Category.findByIdAndUpdate(categoryId, { category: req.body.newCategoryName });
        req.flash("success_msg", "Category updated successfully");
        res.redirect("/admin/categories");
    } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).send("Server Error");
    }
});

// Route to soft-delete or restore a category
router.post("/categories/delete/:id", ensureAdminAuthenticated, async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);
        if (!category) return res.status(404).send("Category not found");

        category.isDeleted = !category.isDeleted;
        await category.save();
        req.flash("success_msg", category.isDeleted ? "Category deleted" : "Category restored");
        res.redirect("/admin/categories");
    } catch (error) {
        console.error("Error deleting/restoring category:", error);
        res.status(500).send("Server Error");
    }
});// GET ALL PRODUCTS
router.get("/products", getAllProductsController); // Fetch all products

// GET SINGLE PRODUCT
// router.get("/products/:id", getSingleProductController); // Fetch a single product by ID
// Route for adding a new product (ensure it's not conflicting with ID route)
router.get('/products/add', (req, res) => {
    res.render('admin/addProduct');
});
// CREATE PRODUCT
router.post("/products/add", ensureAdminAuthenticated, upload.array('images', 10), createProductController); // Create new product with images

// Route to render edit product page
router.get('/products/edit/:id', getEditProduct);

// Route to handle product update
router.post('/products/update/:id', upload.array('images', 5), postUpdateProduct);
// Soft delete route
router.post('/products/delete/:id', deleteProductController);

// View deleted products
router.get('/viewDeletedProducts', viewDeletedProductsController);

module.exports = router;


