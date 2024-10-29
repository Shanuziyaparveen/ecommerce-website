const Product = require("../models/productModel");
const path = require("path");
const fs = require("fs");
const mongoose = require('mongoose');
const multer = require('multer');


// Set storage engine for multer
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Initialize upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit size to 5MB per image
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).array('images', 3); // 'images' is the name field from the form and allows 3 images

// Check file type
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|gif/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

// GET ALL PRODUCTS
const getAllProductsController = async (req, res) => {
  const { keyword } = req.query;
  try {
    const products = await Product.find({ isDeleted: false });
     
    res.render('admin/viewProducts', {
      success: true,
      message: "All products fetched successfully",
      totalProducts: products.length,
      products,
    });
  } catch (error) {
    console.log(error);
    res.render('errorPage', {
      success: false,
      message: "Error in fetching products",
      error,
    });
  }
};

// GET SINGLE PRODUCT
const getSingleProductController = async (req, res) => {
  try {
      const productId = req.params.id;

      // Check if productId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(productId)) {
          return res.status(400).send('Invalid product ID');
      }

      const product = await Product.findById(productId);
      if (!product) {
          return res.status(404).send('Product not found');
      }

      res.render('admin/viewSingleProduct', { product });
  } catch (error) {
      console.error(error);
      res.status(500).send('Server Error');
  }
};

const createProductController = async (req, res) => {
  try {
    // Destructure form fields from req.body
    const { productName, description, price, salePrice, stock, sizesAvailable, availableColors } = req.body;

    // Ensure multer is correctly handling file uploads and req.files exists
    const images = req.files ? req.files.map(file => file.path) : [];

    // Check for required fields and at least 3 images
    if (!productName || !description || !price || !stock || !sizesAvailable || !availableColors || images.length < 3) {
      return res.status(400).send('Missing required fields or not enough images');
    }

    // Create new product object
    const newProduct = new Product({
      productName,
      productDescription: description, // Ensure the correct field name
      price,
      salePrice: salePrice || null, // salePrice is optional
      stock,
      sizesAvailable: Array.isArray(sizesAvailable) ? sizesAvailable : sizesAvailable.split(','), // Handle multiple sizes
      availableColors: Array.isArray(availableColors) ? availableColors : availableColors.split(','), // Handle multiple colors
      images // Store image paths
    });

    // Save product to database
    await newProduct.save();

    // Redirect to the product listing page with a success message
    req.flash('success', 'Product added successfully!'); // Assuming you're using express-flash
    res.redirect('/admin/products');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};


// UPDATE PRODUCT
const updateProductController = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    const { productName, description, price, salePrice, stock, sizesAvailable, availableColors } = req.body;

    // Update product fields
    if (productName) product.productName = productName;
    if (description) product.description = description;
    if (price) product.price = price;
    if (salePrice) product.salePrice = salePrice;
    if (stock) product.stock = stock;
    if (sizesAvailable) product.sizesAvailable = sizesAvailable.split(',').map(size => size.trim());
    if (availableColors) product.availableColors = availableColors.split(',').map(color => color.trim());

    // Handle image upload (optional): If new images are uploaded, replace the existing ones
    if (req.files && req.files.length > 0) {
      // Delete old images (optional)
      for (const image of product.images) {
        const imagePath = path.join(__dirname, '../uploads', path.basename(image));
        fs.unlinkSync(imagePath);
      }

      // Store new images
      product.images = req.files.map(file => path.join('/uploads', file.filename));
    }

    await product.save();

    res.status(200).send({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.log(error);
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: "Invalid product ID",
      });
    }
    res.status(500).send({
      success: false,
      message: "Error in updating product",
      error,
    });
  }
};
const deleteProductController = async (req, res) => {
  try {
    // Find the product by ID
    const product = await Product.findById(req.params.id);

    // Check if the product exists
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    // Soft delete the product
    product.isDeleted = true;
    product.deletedAt = new Date(); // Set the deleted date
    await product.save();

    // Redirect to the viewDeletedProducts.ejs page
    res.redirect('/admin/viewDeletedProducts'); // Adjust the route if necessary
  } catch (error) {
    console.error(error); // Log the error for debugging

    // Handle specific errors
    if (error.name === "CastError") {
      return res.status(400).send({
        success: false,
        message: "Invalid product ID",
      });
    }

    // Return a generic error response
    res.status(500).send({
      success: false,
      message: "Error in deleting product",
      error: error.message || "Internal server error", // Send a message if available
    });
  }
};


// ADD PRODUCT REVIEW
const addProductReviewController = async (req, res) => {
  try {
    const { comment, rating } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).send({
        success: false,
        message: "Product not found",
      });
    }

    const existingReview = product.reviews.find(
      (review) => review.user.toString() === req.user._id.toString()
    );
    if (existingReview) {
      return res.status(400).send({
        success: false,
        message: "Product already reviewed",
      });
    }

    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

    await product.save();

    res.status(200).send({
      success: true,
      message: "Review added successfully",
    });
  } catch (error) {
    console.log(error);
    if (error.name === "CastError") {
      return res.status(500).send({
        success: false,
        message: "Invalid product ID",
      });
    }
    res.status(500).send({
      success: false,
      message: "Error in adding review",
      error,
    });
  }
};
const viewDeletedProductsController = async (req, res) => {
  try {
    const deletedProducts = await Product.find({ isDeleted: true }); // Fetch soft-deleted products
    res.render('admin/viewDeletedProducts', {
      deletedProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error fetching deleted products');
  }
};

// Render the edit product page
const getEditProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render('404', { message: 'Product not found' });
    }
    res.render('admin/updateProduct', { product, success: null, error: null });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
};
const postUpdateProduct = async (req, res) => {
  try {
    const { productName, description, price, salePrice, stock, sizesAvailable, availableColors, removedImages } = req.body;

    // Input validation can go here (e.g., check for minimum size and color selections)

    // Find the product by ID
    let product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).render('404', { message: 'Product not found' });
    }

    // Update product details
    product.productName = productName;
    product.productDescription = description;
    product.price = parseFloat(price); // Ensure price is a number
    product.salePrice = parseFloat(salePrice); // Ensure salePrice is a number
    product.stock = parseInt(stock); // Ensure stock is an integer

    // Ensure sizesAvailable and availableColors are handled as arrays
    product.sizesAvailable = Array.isArray(sizesAvailable) ? sizesAvailable : [sizesAvailable];
    product.availableColors = Array.isArray(availableColors) ? availableColors : [availableColors];

    // Handle removed images
    if (removedImages && removedImages.length > 0) {
      const removedImagesArray = JSON.parse(removedImages); // Convert string to array

      // Remove the images the user selected to delete
      product.images = product.images.filter(image => !removedImagesArray.includes(image));

      // Optionally, delete the images from the file system
      removedImagesArray.forEach(imagePath => {
        const fullPath = path.join(__dirname, '..', 'public', imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath); // Delete the image file
        }
      });
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      // Ensure at least 3 images are uploaded
      if (req.files.length < 3) {
        return res.render('admin/updateProduct', { product, success: null, error: 'You must upload at least 3 images.' });
      }
      const newImages = req.files.map(file => `/uploads/${file.filename}`);
      product.images.push(...newImages);
    }

    // Save the updated product
    await product.save();
    res.render('admin/updateProduct', { product, success: 'Product updated successfully', error: null });

  } catch (err) {
    console.error(err);
    res.render('admin/updateProduct', { product: req.body, success: null, error: 'Failed to update product' });
  }
};

module.exports = {
  getAllProductsController,
  getSingleProductController,
  createProductController,
  deleteProductController,
  viewDeletedProductsController,
  addProductReviewController,
  postUpdateProduct,
  getEditProduct
};
