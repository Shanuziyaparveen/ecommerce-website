
const Address = require("../../models/addressSchema");

const Cart = require("../../models/cartSchema");

const User =require("../../models/userSchema")
const nodemailer = require("nodemailer")
const env=require("dotenv").config();
const Banner=require("../../models/bannerSchema")
const bcrypt=require("bcrypt")
const Product=require("../../models/productSchema")
const path = require('path');
const Category=require("../../models/categorySchema");
const Brand=require("../../models/brandSchema")
const mongoose = require('mongoose');








const addToCart = async (req,res,next) => {
  const user = req.session.user;
  const { productId } = req.body;

  if (!user) {
    return res.status(401).json({ success: false, message: 'You must be logged in to add items to your cart' });
  }

  try {
    // Fetch the user's cart from the database
    let cart = await Cart.findOne({ userId: user._id });

    if (!cart) {
      // Initialize a new cart if it doesn't exist
      cart = new Cart({ userId: user._id, items: [], cartTotal: 0 });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
  // Check if the product is blocked
  if (product.isBlocked) {
    return res.status(403).json({ success: false, message: 'This product is blocked and cannot be added to the cart' });
  }

    // Check if the item already exists in the cart
    const existingItem = cart.items.find(item => item.productId.toString() === productId);
    if (existingItem) {
      // Check if the product is in stock before adding more to the cart
      if (existingItem.quantity < product.quantity && existingItem.quantity < 5) {
        existingItem.quantity += 1;
        existingItem.totalPrice = existingItem.quantity * product.salePrice;
      } else {
        return res.status(400).json({ success: false, message: 'Cannot add more of this product to the cart (Out of stock or limit reached)' });
      }
    } else {
      // Add the product to the cart if it doesn't already exist
      if (product.quantity > 0) {
        cart.items.push({
          productId,
          quantity: 1,
          price: product.salePrice,
          totalPrice: product.salePrice,
        });
      } else {
        return res.status(400).json({ success: false, message: 'Product is out of stock' });
      }
    }

    // Recalculate cart total
    cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

    // Save the updated cart to the database
    await cart.save();

    // Optionally, update the product stock after an item is added to the cart (if your system requires this)
    // product.quantity -= 1;
    // await product.save();

    // Also save the cart in the session (if you want to use session for quick access)
    req.session.cart = cart;

    res.status(200).json({ success: true, message: 'Product added to cart', cart });
  } catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}
};
const getCartPage = async (req,res,next) => {
  try {
    const user = req.session.user;
    if (!user || !user._id) {
      console.error('No valid user found in session');
      return res.redirect('/login');
    }

    const userId = user._id;
    console.log('Session User:', user);

    // Fetch user details including wallet
    const userDetails = await User.findById(userId).select('wallet transactions');
    const walletBalance = req.session.walletBalance ||userDetails.wallet || 0;

    // Log user details fetched from database
    console.log('User Details:', userDetails);

    // Find the cart for the user and populate product details
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!cart || cart.items.length === 0) {
      console.log('No items found in cart for user:', userId);
      return res.render('cart', {
        cartItems: [],
        cartSubtotal: 0,
        cartTax: 0,
        cartTotal: 0,
        totalItems: 0,
        user,
        hasOutOfStockItems: false,
        walletBalance,
        remainingAmountToPay: 0,
      });
    }
    // Filter out blocked products and update the cart
    cart.items = cart.items.filter(item => {
      const product = item.productId;
      return product && !product.isBlocked;
    });

    // Save the updated cart to the database after removing blocked products
    await cart.save();

    // Map cart items with product details
    const cartItems = cart.items
      .map(item => {
        const product = item.productId;
        if (!product) return {}; // Returning empty object instead of null
        const priceToShow = Math.min(product.salePrice, product.regularPrice);
        return {
          id: product._id,
          name: product.productName,
          image: product.productImage[0],
          regularPrice: product.regularPrice,
          salePrice: product.salePrice,
          price: priceToShow,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          stock: product.quantity,
        };
      })
      .filter(item => item.id); // Ensures only valid products are kept

    // Calculate cart totals
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const cartSubtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = 0.1; // You can make this configurable
    const cartTax = cartSubtotal * taxRate;
    const cartTotal = cartSubtotal + cartTax;
    req.session.updatedAmount=cartTotal;
    let discountedAmount = cartTotal;

    // Apply coupon discount if applied
    const applyCoupon = req.session.couponApplied;
    if (applyCoupon) {
      discountedAmount = Math.max(cartTotal - req.session.couponDiscount, 0);
    }

    // Apply wallet balance if applied
    const applyWallet = req.session.applyWallet;
    let remainingAmountToPay = cartTotal;

    if (applyCoupon) {
      remainingAmountToPay -= req.session.couponDiscount;
    }

    if (applyWallet) {
      remainingAmountToPay -= walletBalance;
    }

    remainingAmountToPay = Math.max(remainingAmountToPay, 0);

    // Log session data for debugging
    if (applyWallet) {
      console.log('Session Data (Wallet Applied):', req.session);
      console.log('Remaining Amount to Pay:', remainingAmountToPay);
      console.log('Wallet Balance:', walletBalance);
      console.log('Cart Items:', cartItems);
      console.log('Cart Subtotal:', cartSubtotal);
      console.log('Cart Tax:', cartTax);
      console.log('Total Items:', totalItems);
    }

    const hasOutOfStockItems = cartItems.some(item => item.quantity > item.stock);

    return res.render('cart', {
      cartItems,
      cartSubtotal,
      cartTax,
      cartTotal,
      totalItems,
      user,
      hasOutOfStockItems,
      walletBalance,
      remainingAmountToPay,
    });
  }catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}
};
const updateCart = async (req,res,next) => {
  try {
      const { productId, action } = req.body;
      const userId = req.session.user._id;

      // Find the cart
      const cart = await Cart.findOne({ userId });
      if (!cart) return res.json({ success: false, errorMessage: 'Cart not found' });

      // Find the item
      const cartItem = cart.items.find(item => item.productId.toString() === productId);
      if (!cartItem) return res.json({ success: false, errorMessage: 'Product not in cart' });

      // Validate stock
      const product = await Product.findById(productId);
      if (!product) return res.json({ success: false, errorMessage: 'Product not found' });
      const stock = product.quantity;
      if (action === 'increment') {
          if (cartItem.quantity >= product.quantity) return res.json({ success: false, errorMessage: 'Stock limit reached' });
          if (cartItem.quantity >= 5) return res.json({ success: false, errorMessage: 'Maximum quantity reached' });
          cartItem.quantity++;
      } else if (action === 'decrement') {
          if (cartItem.quantity <= 1) return res.json({ success: false, errorMessage: 'Minimum quantity reached' });
          cartItem.quantity--;
      }

      cartItem.totalPrice = cartItem.quantity * cartItem.price;

      // Recalculate totals
      const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
      const cartSubtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
      const cartTax = (cartSubtotal * 0.18).toFixed(2); // 18% tax example
      const cartTotal = (cartSubtotal + parseFloat(cartTax)).toFixed(2);

      cart.cartTotal = cartTotal;

      await cart.save();

      res.json({
        success: true,
        updatedQuantity: cartItem.quantity,
        updatedTotalPrice: cartItem.totalPrice,
        totalItems,
        cartSubtotal,
        cartTax,
        cartTotal,
        stock
    });
  }  catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}
};


const removeFromCart = async (req,res,next) => {
  const { productId } = req.body;
  const userId = req.session.user._id;  // Assuming user is logged in and user ID is available

  try {
    // Find the cart for the user
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: 'Cart not found' });
    }

    // Find the cart item
    const cartItemIndex = cart.items.findIndex(item => item.productId.toString() === productId.toString());

    if (cartItemIndex === -1) {
      return res.status(404).json({ message: 'Product not found in cart' });
    }

    // Remove the product from the cart
    cart.items.splice(cartItemIndex, 1);

    // Recalculate the cart total
    cart.cartTotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);

    // Save the updated cart
    await cart.save();

    res.status(200).json({ success: true, message: 'Product removed from cart', cart });
  }catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}
};
const getCheckout = async (req,res,next) => {
  try {
    const user = req.session.user;
    
    // Retrieve the user's saved addresses from the database
    const userAddresses = await Address.find({ userId: user._id });

    // If userAddresses is found, extract the 'address' field (array)
    const savedAddresses = userAddresses.length > 0 ? userAddresses[0].address : [];
    const selectedAddress = req.session.selectedAddress || null;
    // Render the checkout page with saved addresses
    res.render('checkout', { 
      selectedAddress,
      savedAddresses: savedAddresses 
    });
  }catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}
};
const selectAddress = async (req,res,next) => {
  console.log("selectAddress function called");
  try {
    const { selectedAddress } = req.body;
    console.log("Selected address:", selectedAddress);
    console.log("Request body:", req.body);

    // Check if selectedAddress is provided
    if (!selectedAddress) {
      return res.render('error', { errorMessage: 'Internal Server Error' });    }

    const userId = req.session.user._id;
    console.log("User ID from session:", userId);

    // Fetch the Address document associated with the user
    const userAddressData = await Address.findOne({ userId: userId });

    if (!userAddressData) {
      return res.status(400).json({ message: "No address found for the user." });
    }

    console.log("User's addresses:", userAddressData.address);

    // Check if the selected address ID matches any address in the address array
    const validAddress = userAddressData.address.find(
      addr => addr._id.toString() === selectedAddress
    );

    if (!validAddress) {
      return res.status(400).json({ message: "Invalid address selected." });
    }

    // Save the selected address to the session
    req.session.selectedAddress = validAddress;
    console.log("Selected address saved in session:", req.session.selectedAddress);
    


     return res.redirect("/checkout");
  }catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}
};


const saveAddress = async (req,res,next) => {
  try {
      const { name, addressType, city, state, pincode, phone, altPhone } = req.body;

      // Validate required fields
      if (!name || !city || !state || !pincode || !phone) {
          return res.status(400).json({ message: "Please fill all required fields." });
      }

      // Create the selectedAddress object
      const selectedAddress = {
          name,
          addressType,
          city,
          state,
          pincode,
          phone,
          altPhone: altPhone || '' // Default to an empty string if altPhone is not provided
      };

      // Store the selectedAddress in the session
      req.session.selectedAddress = selectedAddress;

      // Redirect to the checkout page
      res.redirect('/checkout');
  } catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}
};
const productDetails = async (req,res,next) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);

    // Correctly extract productId
    const productId = req.query.id;
    if (!productId) {
      return res.render('error', { errorMessage: 'Product ID not provided' });
    }

    // Fetch the product and its category
    const product = await Product.findById(productId).populate('category');
    if (!product) {
      return res.render('error', { errorMessage: 'Product not found' });
    }

    const findCategory = product.category || {}; // Handle missing category
    const categoryOffer = findCategory.categoryOffer || 0;
    const productOffer = product.productOffer || 0;
    const totalOffer = categoryOffer + productOffer;

    // Render the product details page
    res.render('product-details', {
      user: userData,
      product: product,
      quantity: product.quantity,
      totalOffer: totalOffer,
      category: findCategory,
    });
  }catch (error) {
    // Forward the error with a status if it exists
    next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
}
};
const getAllProducts = async (req, res, next) => {
  try {
      // Get pagination parameters from query
      const page = parseInt(req.query.page, 10) || 1; // Current page (default: 1)
      const limit = parseInt(req.query.limit, 8) || 8; // Items per page (default: 10)
      const skip = (page - 1) * limit; // Number of items to skip

      // Fetch products with pagination and filtering
      const products = await Product.find({
          isBlocked: false
      })
          .populate('category') // Populate category if needed
          .skip(skip) // Skip items for pagination
          .limit(limit) // Limit items per page
          .exec();

      // Fetch total count of products for pagination
      const totalProducts = await Product.countDocuments({ isBlocked: false });

      // Get the user ID from session to check the wishlist
      const userId = req.session.user; // Assuming the user ID is stored in session

      // Fetch the user document to access the wishlist
      const user = await User.findOne({ _id: userId });
      let wishlist = [];
      if (user) {
          wishlist = user.wishlist; // Get the user's wishlist
      }

      // Generate image paths and additional fields for each product
      products.forEach(product => {
          if (Array.isArray(product.productImage)) {
              product.imagePath = path.join('/uploads', 'product-images', product.productImage[0] || 'default-thumbnail.jpg');
          } else {
              product.imagePath = path.join('/uploads', 'product-images', product.productImage || 'default-thumbnail.jpg');
          }

          // Add an 'outOfStock' field to each product based on quantity
          product.outOfStock = product.quantity <= 0;
          product.isInWishlist = wishlist.includes(product._id.toString()); // Compare IDs as strings
      });

      // Calculate pagination metadata
      const totalPages = Math.ceil(totalProducts / limit);

      // Render the product list page with fetched products and pagination info
      res.render('product-list', {
          products,
          currentPage: page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          nextPage: page + 1,
          prevPage: page - 1,
          limit, 
      });
  } catch (error) {
      // Forward the error with a status if it exists
      next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
  }
};


const getProductDetails = async (req,res,next) => {
  try {
      const productId = req.params.id;

      // Fetch the current product using the productId, populating the category
      const product = await Product.findById(productId).populate('category');
      
      if (!product) {
          return res.status(404).send('Product not found');
      }

      // Ensure product.images is always an array, fallback to an empty array if it's not
      product.images = Array.isArray(product.productImage) ? product.productImage : [product.productImage];

      // Generate image paths for each image in the product's images array
      product.imagePaths = product.images.map(image => {
          return path.join('/uploads', 'product-images', image || 'default-thumbnail.jpg');
      });

      // Fetch related products based on the category of the current product
      const relatedProducts = await Product.find({
          category: product.category._id, // Use category's _id
          _id: { $ne: productId } // Exclude the current product from the related products
      }).limit(4); // Limit the number of related products to display

      // Generate image paths for related products
      relatedProducts.forEach(relatedProduct => {
          relatedProduct.imagePaths = Array.isArray(relatedProduct.productImage) 
              ? relatedProduct.productImage.map(image => path.join('/uploads', 'product-images', image || 'default-thumbnail.jpg'))
              : [path.join('/uploads', 'product-images', relatedProduct.productImage || 'default-thumbnail.jpg')];
      });

      // Render the product-detail page and pass the product and relatedProducts to the template
      res.render('product-detail', { 
          product, 
          relatedProducts 
      });
  }   catch (error) {
      // Forward the error with a status if it exists
      next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
  }
};
const loadShoppingPage = async (req,res,next) => {
  try {
      // Get user session data
      const user = req.session.user;
      const userData = user ? await User.findOne({ _id: user }) : null;

      // Fetch categories and brands
      const categories = await Category.find({ isListed: true });
      const brands = await Brand.find({ isBlocked: false });

      // Extract filters from query parameters
      const brand = req.query.brand;
      const sortOption = req.query.sort || 'popularity';
      const gt = parseInt(req.query.gt) || 0;
      const lt = parseInt(req.query.lt) || 1000000;
      const selectedPriceRange = { gt, lt };
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = 9;
      const skip = (page - 1) * limit;

      // Build the base query for products
      let query = {
          isBlocked: false,
          quantity: { $gt: 0 },
          salePrice: { $gte: gt, $lte: lt }
      };

      // Add category filter if specified
      if (req.query.catg && req.query.catg.length > 0) {
          query.category = { $in: req.query.catg }; // Use $in to filter for multiple categories
      }

      // Add brand filter if specified
      if (brand) {
          query.brand = brand; // Filter by selected brand
      }

      // Fetch products based on the query
      const products = await Product.find(query)
          .sort(sortOption === 'popularity' ? { popularity: -1 } : { salePrice: 1 }) // Sorting by popularity or price
          .skip(skip)
          .limit(limit)
          .lean(); // Make sure to use `.lean()` for better performance if you don't need Mongoose document methods

      // Get the total number of products
      const totalProducts = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalProducts / limit);

      // Prepare categories for rendering
      const categoriesWithIds = categories.map(cat => ({ name: cat.name, id: cat._id }));

      const noProductsFound = products.length === 0;

      // Render the shopping page
      res.render("shop", {
          user: userData,
          products,
          category:categoriesWithIds,
         brand: brands,
          totalProducts,
          currentPage: page,
          totalPages,
          selectedPriceRange,
          selectedCategory: req.query.catg || [],
          selectedBrand: brand || null,
          noProductsFound,
          sortOption,
      });
  }   catch (error) {
      // Forward the error with a status if it exists
      next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
  }
};

const filterProduct = async (req,res,next) => {
  try {
      const user = req.session.user;
      const brand = req.query.brand;
      const sortOption = req.query.sort || 'popularity';

      // Extract 'gt' and 'lt' for price range
      const gt = parseInt(req.query.gt) || 0;
      const lt = parseInt(req.query.lt) || 1000000;
      const selectedPriceRange = { gt, lt };

      // Fetch brand details if specified
      const findBrand = brand ? await Brand.findOne({ _id: brand }) : null;

      // Log parameters for debugging
      console.log("Brand Query Parameter:", brand);
      console.log("Find Brand from Database:", findBrand);

      // Get all brands for the filter options
      const brands = await Brand.find({}).lean();

      // Build product query
      const query = {
          isBlocked: false,
          quantity: { $gt: 0 }
      };

      if (findBrand) {
          query.brand = findBrand.brandName;
      }

      // Fetch and sort products
      let findProducts = await Product.find(query).lean();
      findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

      // Log filtered products for debugging
      console.log("Filtered Products Count:", findProducts.length);
      console.log("Filtered Products:", findProducts);

      // Fetch categories for rendering
      const categories = await Category.find({ isListed: true });

       // Pagination settings
       const itemsPerPage = 6;
       const currentPage = Math.max(parseInt(req.query.page) || 1, 1);
       const startIndex = (currentPage - 1) * itemsPerPage;
       const endIndex = startIndex + itemsPerPage;
       const totalPages = Math.ceil(findProducts.length / itemsPerPage);


      // Fetch user data and update search history if logged in
      let userData = null;
      if (user) {
          userData = await User.findOne({ _id: user });
          if (userData) {
              const searchEntry = {
                  brand: findBrand ? findBrand.brandName : null,
                  searchedOn: new Date()
              };
              userData.searchHistory.push(searchEntry);
              await userData.save();
          }
      }

      // Slice products for the current page
      const currentProducts = findProducts.slice(startIndex, endIndex);

      res.render("shop", {
          user: userData,
          products: currentProducts,
          category: categories,
          brand: brands,
          currentPage,
          totalPages,
          selectedBrand: brand || null,
          selectedPriceRange,
          sortOption
      });
  }  catch (error) {
      // Forward the error with a status if it exists
      next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
  }
};


const filterByPrice = async (req,res,next) => {
  try {
      const user = req.session.user;
      const userData = await User.findOne({ _id: user });
      const brands = await Brand.find({}).lean();
      const categories = await Category.find({ isListed: true }).lean();

      // Extract the 'gt' (greater than) and 'lt' (less than) values from the query parameters
      const gt = parseInt(req.query.gt) || 0; // Default to 0 if not provided
      const lt = parseInt(req.query.lt) || 1000000; // Default to a very high value if not provided
      const sortOption = req.query.sort || 'popularity'; 

      // Create selectedPriceRange object
      const selectedPriceRange = { gt, lt };
      console.log("Selected Price Range:", selectedPriceRange);
      // Build the product filter query
      let findProducts = await Product.find({
          salePrice: { $gt: gt, $lt: lt },
          isBlocked: false,
          quantity: { $gt: 0 }
      }).lean();

      // Sort products by creation date
      findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

         // Pagination setup
         let itemsPerPage = 6;
         let currentPage = parseInt(req.query.page) || 1;
         let totalProducts = findProducts.length;
// Handle if no products match the filter criteria
if (totalProducts === 0) {
  return res.render("shop", {
      user: userData,
      products: [],
      category: categories,
      brand: brands,
      currentPage,
      totalPages: 1, // At least one page should show, even if it's empty
      selectedPriceRange,
      sortOption
  });
}

// Calculate pagination details
let totalPages = Math.ceil(totalProducts / itemsPerPage);
if (currentPage > totalPages) {
  currentPage = totalPages; // If user requests a page beyond the last, set it to the last page
}

let startIndex = (currentPage - 1) * itemsPerPage;
let endIndex = startIndex + itemsPerPage;

// Get the current page products
const currentProduct = findProducts.slice(startIndex, endIndex);

      // Store filtered products in session
      req.session.filteredProducts = findProducts;

      // Render the view with selectedPriceRange and other variables
      res.render("shop", {
          user: userData,
          products: currentProduct,
          category: categories,
          brand: brands,
          currentPage,
          totalPages,
          selectedPriceRange:selectedPriceRange,  // Ensure this is passed to the view
          sortOption
      });

  }  catch (error) {
      // Forward the error with a status if it exists
      next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
  }
};
const searchProducts = async (req,res,next) => {
  try {
      const user = req.session.user;
      const userData = await User.findOne({ _id: user });
      const search = req.body.query || ''; // Default to empty string if query is undefined
      console.log('Search query:', search); // Check if the query is being received correctly

      // Fetch all brands and listed categories
      const brands = await Brand.find({}).lean();
      const categories = await Category.find({ isListed: true }).lean();
      const categoryIds = categories.map(category => category._id.toString());
      console.log('Category IDs:', categoryIds); // Ensure categories are being retrieved correctly

      const sortOption = req.query.sort || 'popularity'; 
      
      // Extract 'gt' and 'lt' for price range
      const gt = parseInt(req.query.gt) || 0;
      const lt = parseInt(req.query.lt) || 1000000;
      const selectedPriceRange = { gt, lt };
      console.log('Price Range:', gt, lt); // Log price range values

      // Escape special characters in search
      const escapedSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'); 

      // Build the query object based on search criteria
      let query = {
          productName: { $regex: ".*" + escapedSearch + ".*", $options: 'i' }, // Case-insensitive regex search
          isBlocked: false,
          quantity: { $gt: 0 },
         
          salePrice: { $gte: gt, $lte: lt }
      };

      console.log('MongoDB Query:', query); // Check the final query sent to MongoDB

      // Sorting logic for database query
      let sortCriteria = {};
      if (sortOption === 'popularity') {
          sortCriteria = { createdOn: -1 }; // Sort by most recent products
      } else if (sortOption === 'priceAsc') {
          sortCriteria = { salePrice: 1 }; // Sort by ascending price
      } else if (sortOption === 'priceDesc') {
          sortCriteria = { salePrice: -1 }; // Sort by descending price
      }

      // Fetch filtered products from the database with pagination
      const itemsPerPage = 6;
      const currentPage = parseInt(req.query.page) || 1;
      const startIndex = (currentPage - 1) * itemsPerPage;
      
      const searchResult = await Product.find(query)
          .sort(sortCriteria) // Apply the sorting
          .skip(startIndex)    // Skip the products for pagination
          .limit(itemsPerPage) // Limit to the number of products per page
          .lean();

      // Count total results for pagination
      const totalCount = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalCount / itemsPerPage);

      // Render the 'shop' page with search results
      res.render("shop", {
          user: userData,
          products: searchResult,
          category: categories,
          brand: brands,
          currentPage,
          totalPages,
          count: totalCount,
          selectedPriceRange,
          sortOption,
          searchQuery: search // Send the search query back to the template
      });
  }  catch (error) {
      // Forward the error with a status if it exists
      next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
  }
};


const getCategorySort = async (req,res,next) => {
  try {
      const sortOption = req.query.sort || 'popularity';
      let sortCriteria = {};
      const user = req.session.user;
      const userData = user ? await User.findOne({ _id: user }) : null;

      const search = req.query.query || ''; 
      const brands = await Brand.find({}).lean();
      const categories = await Category.find({ isListed: true }).lean();

      const gt = parseInt(req.query.gt) || 0;
      const lt = parseInt(req.query.lt) || 1000000;
      const selectedPriceRange = { gt, lt };

      console.log('Query Parameters:', req.query);  // Log query parameters
      console.log('Categories Selected:', req.body.catg);  // Log selected categories
      console.log('Price Range:', selectedPriceRange);  // Log selected price range

      if (sortOption === 'popularity') {
          sortCriteria = { popularity: -1 };
      } else if (sortOption === 'priceAsc') {
          sortCriteria = { price: 1 };
      } else if (sortOption === 'priceDesc') {
          sortCriteria = { price: -1 };
      }
      

      // Ensure req.body.catg is an array, even if it's a single value
      let selectedCategories = req.body.catg;
      if (!Array.isArray(selectedCategories)) {
          selectedCategories = [selectedCategories]; // Make it an array if it's a single value
      }

      // Validate that each category ID is a valid ObjectId
      const validCategories = selectedCategories.filter(catId => mongoose.Types.ObjectId.isValid(catId));

      const searchQuery = {
          category:req.body.catg
      };
      if (validCategories.length > 0) {
          console.log("Valid Categories selected:", validCategories);  // Debugging
          // Use ObjectId in the search query if categories are valid
          searchQuery.category = { $in: validCategories.map(catId => mongoose.Types.ObjectId(catId)) };
      }

      if (search) {
          searchQuery.productName = { $regex: search, $options: 'i' };  // Case-insensitive search
      }

      console.log('Search Query:', searchQuery);  // Debugging: Log the final search query

      // Fetch products based on search query
      let products = await Product.find(searchQuery)

      // Debugging: Check the query and fetched products
      console.log('Fetched Products:', products);  // Log the fetched products
      console.log('Product Categories:', products.map(p => p.category));  // Log categories of fetched products

      if (products.length === 0) {
          console.log('No products found with the given filters.');
      }

      const itemsPerPage = 6;
      const currentPage = Math.max(parseInt(req.query.page) || 1, 1);
      const totalPages = Math.ceil(products.length / itemsPerPage);
      const startIndex = (currentPage - 1) * itemsPerPage;
      const currentProducts = products.slice(startIndex, startIndex + itemsPerPage);

      res.render("shop", {
          user: userData,
          products: currentProducts,
          category: categories,
          brand: brands,
          currentPage,
          totalPages,
          selectedPriceRange,
          sortOption,
          search
      });
  }  catch (error) {
      // Forward the error with a status if it exists
      next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
  }
};

const filterSort = async (req,res,next) => {
  try {
      console.log("Starting filterSort function");

      const sortOption = req.query.sort || 'popularity'; // Get the sort option from query parameters
      console.log("Sort option received:", sortOption);

      const user = req.session.user;
      console.log("Session user ID:", user);

      const userData = user ? await User.findOne({ _id: user }) : null;
      console.log("User data fetched:", userData ? userData.name : "No user found");

      const search = req.query.query || '';
      console.log("Search query received:", search);

      const brands = await Brand.find({}).lean();
      const categories = await Category.find({ isListed: true }).lean();
      console.log("Brands fetched:", brands.length);
      console.log("Categories fetched:", categories.length);

      const gt = parseInt(req.query.gt) || 0;
      const lt = parseInt(req.query.lt) || 1000000;
      const selectedPriceRange = { gt, lt };
      console.log("Selected price range:", selectedPriceRange);

      let sortCriteria;
      // Determine the sorting criteria based on the sortOption value
      switch (sortOption) {
          case 'priceLowToHigh':
              sortCriteria = { salePrice: 1 }; // Ascending order
              break;
          case 'priceHighToLow':
              sortCriteria = { salePrice: -1 }; // Descending order
              break;
         
          case 'Discount':
            
              sortCriteria = { productOffer: 1 }; 
              break;
          case 'newArrivals':
              sortCriteria = { createdAt: -1 }; // Most recent first
              break;
          case 'aToZ':
              sortCriteria = { name: 1 }; // Sort alphabetically A-Z
              break;
          case 'zToA':
              sortCriteria = { name: -1 }; // Sort alphabetically Z-A
              break;
          default:
              sortCriteria = { popularity: -1 }; // Default to popularity
      }
      console.log("Sort criteria determined:", sortCriteria);

      const products = await Product.find(
      ).sort(sortCriteria);

      console.log("Products fetched:", products.length);
      if (products.length > 0) {
          console.log("First product:", products[0]);
      }

      const itemsPerPage = 6;
      const currentPage = Math.max(parseInt(req.query.page) || 1, 1);
      const totalPages = Math.ceil(products.length / itemsPerPage);
      console.log("Pagination details - Current Page:", currentPage, "Total Pages:", totalPages);

      const startIndex = (currentPage - 1) * itemsPerPage;
      const currentProducts = products.slice(startIndex, startIndex + itemsPerPage);
      console.log("Products for current page:", currentProducts.length);

      res.render('shop', {
          products: currentProducts,
          sortOption,
          user: userData,
          category: categories,
          brand: brands,
          currentPage,
          totalPages,
          selectedPriceRange,
          search
      });
  }  catch (error) {
      // Forward the error with a status if it exists
      next({ status: error.status || 500, message: error.message || 'Unexpected error occurred.' });
  }
};
module.exports = {
  addToCart,
  getCartPage,
  removeFromCart,
  getCheckout,
  selectAddress,
  saveAddress,
  productDetails, updateCart,
  getAllProducts,getProductDetails,loadShoppingPage,filterProduct,filterByPrice,searchProducts,filterSort,getCategorySort,
};
