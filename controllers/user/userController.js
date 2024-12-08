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

const { generateReferralCode } = require('../../utils/cryptoUtils');



const loadHomepage = async (req, res) => {
    try {
        const today=new Date().toISOString();
        const findBanner= await Banner.find({
            startDate: {$lte: new Date(today)},
            endDate: {$gte: new Date(today)},
        })
        const user = req.session.user; // This should be an object now
        // console.log("Session user:", user); // Log the entire user object
        const categories=await Category.find({isListed: true})
        let productData = await Product.find({isBlocked: false,
            category:{$in:categories.map(category=>category._id)}, quantity:{$gt:0}})
            productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
           productData = productData.slice(0,4);
        
    
           if (user) {
            // Check if the user is blocked
            const userData = await User.findById(user._id);
            if (userData && userData.isBlocked) {
                // If the user is blocked, destroy the session and redirect to login
                req.session.destroy((err) => {
                    if (err) {
                        console.log("Error while destroying session", err);
                        return res.redirect("/pageNotFound");
                    }
                    return res.redirect("/login");
                });
            } else {
                // If the user is not blocked, render the homepage
                return res.render('home', { user: userData, products: productData, banner: findBanner || [] });
            }
        } else {
            // If no user is logged in, render the homepage without user data
            return res.render('home', { products: productData, banner: findBanner || [] });
        }
    } catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
};

const pageNotFound = async (req, res) => {
    try {
        // Passing the statusCode (404) to the EJS template
        res.status(404).render("page-404", { statusCode: 404 });
    }  catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
};

const loadSignup=async(req,res)=>{
    try{
        res.render("signup")
    } catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
}
const loadShopping=async(req,res)=>{
    try{
        res.render("shop")
    } catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
}
function generateOtp(){
    return Math.floor(100000 +Math.random()*900000).toString();
}
async function sendVerificationEmail(email,otp){
    try {
        const transporter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD

            }
        })

        const info = await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Verify your account",
            text:`Your OTP is: ${otp}`,
            html:`<b>Your OTP is: ${otp}</b>`
        })
        return info.accepted.length>0
    } catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
}
const signup = async(req,res)=>{
    try{
const{name, phone ,email,password,cPassword ,referralCode }=req.body;
if(password!==cPassword){
    return res.render("signup",{message:"Password do not match"});

}
const findUser= await User.findOne({email})
if(findUser){
    return res.render("signup",{message:"User with this email already exists"});

}
const newReferralCode = generateReferralCode();

// Check if a referral code was provided and if it is valid
let referredBy = null;
if (referralCode) {
    const referringUser = await User.findOne({ referralCode: referralCode });
    if (referringUser) {
        referredBy = referringUser.referralCode; // Store the referral code of the user who referred them
    } else {
        return res.render("signup", { message: "Invalid referral code" });
    }
}
const otp=generateOtp();
const emailSend = await sendVerificationEmail(email,otp);
if(!emailSend){
    return res.json("email-error")
}

req.session.userOtp = otp;
req.session.userData={name,phone,email,password, referralCode: newReferralCode, referredBy};
res.render("verify-otp");
console.log("OTP sent",otp);

    } catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
}
const securePassword=async(password)=>{
    try {
        const passwordHash=await bcrypt.hash(password,10)
        return passwordHash;
    }  catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
}
const verifyOtp=async (req,res)=>{
    try {
        const {otp}=req.body;
        console.log(otp);
        if (otp===req.session.userOtp){
            const user=req.session.userData
            const passwordHash = await securePassword(user.password)
            const saveUserData= new User({
                name:user.name,
                email:user.email,
                phone:user.phone,
                password:passwordHash,
                referralCode: user.referralCode,
                referredBy: user.referredBy,
            })
            await saveUserData.save();

              // If the user was referred by someone, reward both the referrer and the referred user
              if (user.referredBy) {
                // Reward the referrer (the user who referred)
                const referrer = await User.findOne({ referralCode: user.referredBy });
                if (referrer) {
                    referrer.rewards += 10; // Example reward points
                    await referrer.save();
                }
            }

            // Reward the new user (optional)
            saveUserData.rewards += 5; // Example reward points for the new user
            await saveUserData.save();
            req.session.user=saveUserData._id;
            res.json({success:true,redirectUrl:"/"})
        }else{
            res.status(400).json({success:false,message:"Invalid OTP,please try again"})
        }
        
    } catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
}

const resendOtp=async(req,res)=>{
    try {
        const {email}=req.session.userData;
        if(!email){
            return res.status(400).json({success:false,message:"Email not found in session"})
        }
        const otp = generateOtp();
        req.session.userOtp=otp;
        const emailSent=await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend OTP",otp);
            res.status(200).json({success:true,message:"OTP Resend Succesfully"})

            
        }else{
            res.status(500).json({success:false,message:"Failed to Resend OTP, please try again"})
        }
    }catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
}
const loadLogin = async (req,res)=>{
    try {
        if(!req.session.user){
            return res.render("login",{loggedin:false})
        }else{
            res.redirect("/")
        }
    }catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }

}
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const findUser = await User.findOne({ isAdmin: 0, email: email });
        
        if (!findUser) {
            return res.render("login", { message: "User not found",loggedin:false});
        }

        if (findUser.isBlocked) {
            return res.render("login", { message: "User is blocked by admin" ,loggedin:false});
        }

        const passwordMatch = await bcrypt.compare(password, findUser.password);
        if (!passwordMatch) {
            return res.render("login", { message: "Incorrect password" ,loggedin:false});
        }

       // Store user details in session
req.session.user = {
    _id: findUser._id,
    name: findUser.name,   // add fields you need
    email: findUser.email  // add fields you need
};

        // Store user data in res.locals for use in views
        res.locals.user = findUser;

        // Redirect to home page
        res.redirect("/");
    }  catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
}

const logout=  async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log("session destruction error",err.message);
                return res.redirect("/pageNotFound")
            }
            return res.redirect("/login")
        })
    }  catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
}
const getAllProducts = async (req, res) => {
    try {
        // Fetch all products, including products with quantity <= 0
        const products = await Product.find({ 
            isBlocked: false
        })
        .populate('category') // Populate category if needed
        .exec();
  // Get the user ID from session to check the wishlist
  const userId = req.session.user; // Assuming the user ID is stored in session

  // Fetch the user document to access the wishlist
  const user = await User.findOne({ _id: userId });
  let wishlist = [];
  if (user) {
    wishlist = user.wishlist; // Get the user's wishlist
  }

        // Generate image paths for each product
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
        
        

        // Render the product list page with fetched products
        res.render('product-list', {
            products
        });
    } catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
};

const getProductDetails = async (req, res) => {
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
    }  catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
};
const loadShoppingPage = async (req, res) => {
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
    } catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
};

const filterProduct = async (req, res) => {
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
    }catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
};


const filterByPrice = async (req, res) => {
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

    } catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
};
const searchProducts = async (req, res) => {
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
    } catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
};


const getCategorySort = async (req, res) => {
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
    } catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
};

const filterSort = async (req, res) => {
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
    }catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
};
const addMoney = async (req, res) => {
    try {
      const userId = req.session.user;
      const { amount } = req.body;
  
      // Find the user by ID
      const user = await User.findById(userId);
      
      // Update the user's wallet balance
      user.wallet += parseFloat(amount);
      
      // Add a new transaction entry with status 'Pending'
      user.transactions.push({
        amount: parseFloat(amount),
        type: 'Payment', // Type of the transaction
        date: new Date(), // Date of transaction
        orderId: null, // No associated order for wallet top-up
        status: 'Active', 
      });
  
      // Save the updated user data
      await user.save();
  
      res.redirect('/userProfile'); // Redirect to the profile page after updating the wallet
    } catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
  };
  const selectWallet = async (req, res) => {
    try {
        const { paymentMethod } = req.body;

        // Check if the selected payment method is 'wallet'
        if (paymentMethod === 'wallet') {
            // Store this in the session so we know the wallet was applied
            req.session.applyWallet = true;

            // Fetch user details including wallet balance
            const user = req.session.user;
            const userId = user._id;
            const userDetails = await User.findById(userId).select('wallet');
            const walletBalance = userDetails.wallet || 0;

            // Calculate remaining amount to pay (you can modify this calculation as per your logic)
            const cartTotal = req.session.cartTotal || 0;  // Make sure cartTotal is stored in session
            const updatedAmount=req.session.updatedAmount || cartTotal; //
            const remainingAmountToPay = Math.max(updatedAmount - walletBalance, 0);

            // Update session with the wallet balance and remaining amount to pay
            req.session.walletBalance = walletBalance;
            req.session.remainingAmountToPay = remainingAmountToPay;

            // Send the updated data to the frontend
            res.json({
                walletBalance,
                remainingAmountToPay,
            });
        } else {
            // If paymentMethod is not 'wallet', return an error
            res.status(400).send('Invalid payment method');
        }
    }catch (error) {
        next(error); // Pass the error to the errorHandler middleware
    }
};


  
module.exports = {
   pageNotFound,
    loadHomepage,
loadShopping,loadSignup,signup,verifyOtp,resendOtp,loadLogin,login,logout, 
getAllProducts,getProductDetails,loadShoppingPage,filterProduct,filterByPrice,searchProducts,filterSort,getCategorySort,addMoney,selectWallet
 };