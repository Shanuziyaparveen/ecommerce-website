const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const getwishList = async (req, res) => { 
  try {
    // Get user ID from session
    const userId = req.session.user;

    // Find the user and get the wishlist
    const user = await User.findOne({ _id: userId }, { wishlist: 1 });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Pagination setup
    const page = parseInt(req.query.page) || 1;  // Get the current page from query string, default to 1
    const limit = 10;  // Set number of products per page
    const skip = (page - 1) * limit;  // Calculate the number of products to skip based on the current page

    // Fetch the products that are in the user's wishlist (with pagination)
    const wishlistProducts = await Product.find({ _id: { $in: user.wishlist } })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get the total number of products in the wishlist for pagination
    const totalProducts = await Product.countDocuments({ _id: { $in: user.wishlist } });

    // Calculate total pages
    const totalPages = Math.ceil(totalProducts / limit);

    // Adding 'isInWishlist' flag to each product
    wishlistProducts.forEach(product => {
      product.isInWishlist = true; // This flag is set to true for all wishlist products
    });

    // Render wishlist page with fetched products and pagination info
    res.render("wishlist", {
      products: wishlistProducts,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'An error occurred while fetching the wishlist' });
  }
};

const addTowishList = async (req, res) => {
  try {
    // Log session data to check if the user ID is available
    console.log('Session Data:', req.session.user);  // Check if user object is in session

    const _id = req.session.user;  // Get the user ID from the session
    const { productId } = req.body;  // Get the product ID from the request body

    // If there is no user ID in session, return an error
    if (!_id) {
      return res.status(401).json({ success: false, message: 'User not logged in' });
    }

    // Check if the user exists in the database
    const user = await User.findOne({ _id: _id });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the product is already in the wishlist
    if (user.wishlist.includes(productId)) {
      return res.status(400).json({ success: false, message: 'Product is already in your wishlist' });
    }

    // Add the product to the wishlist
    await User.updateOne(
      { _id: _id },
      { $addToSet: { wishlist: productId } }
    );

    // Respond with a success message
    res.status(200).json({ success: true, message: 'Product added to wishlist' });
  }   catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}
};
const getRemoveFromWishlist = async (req, res) => {
  if (req.session.user) {
    const userId = req.session.user;  // Assuming session stores userId
    const proId = req.params.id;      // The product ID to remove from wishlist

    try {
      // Pull the product ID from the wishlist array
      const result = await User.updateOne(
        { _id: userId },
        { $pull: { wishlist: proId } }  // Directly remove the product ID from the wishlist
      );

      if (result.nModified === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found in your wishlist.',
        });
      }

      // Successfully removed product from wishlist
      res.json({
        success: true,
        message: 'Product removed from wishlist.',
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred. Please try again later.',
      });
    }
  } else {
    // User is not logged in
    res.status(401).json({
      success: false,
      message: 'You must be logged in to remove a product from your wishlist.',
    });
  }
};



module.exports={getwishList,addTowishList,getRemoveFromWishlist}