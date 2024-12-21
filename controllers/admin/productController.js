const mongoose = require('mongoose');

const Product=require('../../models/productSchema')
const Category=require('../../models/categorySchema')
const Brand=require('../../models/brandSchema')
const User=require('../../models/userSchema')
const fs=require('fs');
const path=require('path');
const sharp=require('sharp');

 const getProductAddPage = async(req,res)=>{
    try{
    const category = await Category.find({isListed: true});
        const brand = await Brand.find({isBlocked:false});
    res.render("product-add",{
        cat: category,
        brand: brand
    });

}catch(error) {
    res.redirect('/pageerror')
}
}

const addProducts=async (req, res) => {
    try {
        const products=req.body;
        const productExists = await Product.findOne({
            productName: products.productName,

        });
        if(!productExists) {
            const images=[];
            if(req.files && req.files.length > 0) {
                for(let i=0;i<req.files.length;i++) {
                   const originalImagePath=req.files[i].path;
                   const resizedImagePath=path.join('public','uploads','product-images',req.files[i].filename);
                   await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }
            const categoryId=await Category.findOne({name:products.category});
        if(!categoryId){
            return res.render('admin-error').json({ message: "Invalid category name" });

        }
        const newProduct=new Product({
            productName: products.productName,
            description: products.description,
            regularPrice: products.regularPrice,
            salePrice: products.salePrice,
            category: categoryId.name, // Save category name instead of category ID            brand: products.brand,
            
            CreatedOn: new Date(),
            quantity: products.quantity,
            size:products.size,
            color: products.color,
            productImage: images,
            status:'Available'

        });
        await newProduct.save();
        return res.redirect('/admin/addProducts');
    } else{
        return res.status(400).json("product already exists")
    }
}

        catch (error) {
            console.log("error saving product",error);
        return res.redirect('/admin/pageerror');

    }
}
const getAllProducts = async (req, res) => {
    try {
      const search = req.query.search || "";
      const page = parseInt(req.query.page) || 1;
      const limit = 4;
  
      // Fetch product data with search and pagination, and populate 'category'
      const productData = await Product.find({
        $or: [
          { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
        ],
      })
        .limit(limit)
        .skip((page - 1) * limit)
        .populate("category")
        .exec();
  
      // Get the total count of matching products for pagination
      const count = await Product.countDocuments({
        $or: [
          { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
          { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
        ],
      });
  
      // Fetch category and brand data
      const category = await Category.find({ isListed: true });
      const brand = await Brand.find({ isBlocked: false });
  
      // Check if category and brand data exist
      if (category && brand) {
        res.render("products", {
          data: productData,
          currentPage: page,
          totalpages:page,
          totalPages: Math.ceil(count / limit),
          cat: category,
          brand: brand,
        });
      } else {
        res.render("page-404");
      }
    } catch (error) {
      res.redirect("/pageerror");
    }
  };
  const addProductOffer = async (req, res) => {
    try {
        const { productId, category, percentage } = req.body;

        // Log the received data for debugging
        console.log("Received Product ID:", productId);
        console.log("Received Category:", category);
        console.log("Received Percentage:", percentage);

        // Check if productId, category, and percentage are provided
        if (!productId || !category || !percentage) {
            return res.status(400).json({ status: false, message: "Product, category, and percentage are required." });
        }

        // Ensure percentage is a valid number and within the correct range (0 to 100)
        const parsedPercentage = parseFloat(percentage);
        if (isNaN(parsedPercentage) || parsedPercentage < 0 || parsedPercentage > 100) {
            return res.status(400).json({ status: false, message: "Invalid percentage value. It should be a number between 0 and 100." });
        }

        // Find the product by its ID
        const findProduct = await Product.findById(productId);
        if (!findProduct) {
            console.log("Product not found for ID:", productId);
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        // Ensure product has regularPrice and salePrice
        if (!findProduct.regularPrice || !findProduct.salePrice) {
            return res.status(400).json({ status: false, message: "Product does not have regularPrice or salePrice." });
        }

        // Find the category by its name (update the field if different)
        const findCategory = await Category.findOne({ name: category }); // Change 'name' to your actual field name
        if (!findCategory) {
            console.log("Category not found for name:", category);
            return res.status(404).json({ status: false, message: "Category not found" });
        }

        // Set default category offer to 0 if undefined
        if (!findCategory.categoryOffer) {
            findCategory.categoryOffer = 0;
        }

        // Compare category offer with the new product offer
        if (findCategory.categoryOffer > parsedPercentage) {
            console.log("Category Offer is Higher:", findCategory.categoryOffer, "vs", parsedPercentage);
            return res.json({ status: false, message: "This product category already has a higher category offer" });
        }

        // Calculate the discount and update the sale price
        const discountAmount = Math.floor(findProduct.regularPrice * (parsedPercentage / 100));
        findProduct.salePrice = findProduct.regularPrice - discountAmount;
        findProduct.productOffer = parsedPercentage;

        console.log("Discount Amount:", discountAmount);
        console.log("Updated Sale Price:", findProduct.salePrice);

        // Save the updated product
        await findProduct.save();
        console.log("Product Saved Successfully");

        // Reset category offer to 0
        findCategory.categoryOffer = 0;

        // Save the updated category
        await findCategory.save();
        console.log("Category Saved Successfully");

        // Send success response
        res.json({ status: true, message: "Product offer added successfully" });

    } catch (error) {
        console.error("Error in adding product offer:", error);
        if (!res.headersSent) {
            res.status(500).json({ status: false, message: "Internal server error" });
        }
    }
};

const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;
        
        // Query for the product by _id (not 'id')
        const findProduct = await Product.findOne({ _id: productId });

        // Check if the product is found
        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        // Retrieve the offer percentage
        const percentage = findProduct.productOffer;

        // Remove the offer by resetting the sale price and offer
        findProduct.salePrice = findProduct.salePrice + Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = 0;

        // Save the updated product
        await findProduct.save();

        return res.json({ status: true, message: "Product offer removed successfully" });
    } catch (error) {
        res.redirect("/pageerror");
      }
};


const blockProduct=async (req, res) => {
    try {
        let id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/products")
    } catch (error) {

        res.redirect("/pageerror");
    }
}

const unblockProduct=async (req, res) => {
    try {
        let id=req.query.id;
        await Product.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect("/admin/products")
    } catch (error) {

        res.redirect("/pageerror");
    }
}

const getEditProduct = async (req, res) => {
    try {
        const id=req.query.id;
        const product=await Product.findById(id);
        const category=await Category.find({});
        const brand=await Brand.find({})
        res.render('product-edit',{product:product
            ,cat:category,
            brand:brand});
    } catch (error) {
        res.redirect("/pageerror");
    }
}
const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;

        // Debug: Log the received category ID to check its format
        console.log("Received Category ID:", data.category);

        // Validate the category ID
        if (!mongoose.Types.ObjectId.isValid(data.category)) {
            return res.status(400).json({ error: "Invalid category ID" });
        }

        // Check if the product exists
        const product = await Product.findOne({ _id: id });
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // Check if a product with the same name already exists, excluding the current product
        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });
        if (existingProduct) {
            return res.status(400).json({ error: "Product already exists" });
        }

        // Prepare images array if files are uploaded
        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }
            // Find category by ID (since data.category is the category ID)
        const category = await Category.findById(data.category);
        if (!category) {
            return res.status(400).json({ error: "Invalid category ID" });
        }

        // Prepare update fields
        const updateFields = {
            productName: data.productName,
            description: data.description,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            category: category.name,
            brand: data.brand,
            quantity: data.quantity,
            size: data.size,
            color: data.color
        };

        // If new images are uploaded, add them to the product images array
        if (images.length > 0) {
            updateFields.$push = { productImage: { $each: images } };
        }
        

        // Update the product
        await Product.findByIdAndUpdate(id, updateFields, { new: true });

        res.redirect('/admin/products');
    } catch (error) {
        console.error("Error updating product:", error);
        res.redirect("/pageerror");
    }
};

const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;

        // Check if image name and product id are provided
        if (!imageNameToServer || !productIdToServer) {
            return res.status(400).send({ status: false, message: "Image name or product ID is missing." });
        }

        // Find the product and remove the image from the array
        const product = await Product.findByIdAndUpdate(
            productIdToServer,
            { $pull: { productImage: imageNameToServer } },
            { new: true }
        );

        if (!product) {
            return res.status(404).send({ status: false, message: "Product not found." });
        }

        // Path to the image
        const imagePath = path.join("public", "uploads", "re-image", imageNameToServer);

        // Check if image exists and delete
        if (fs.existsSync(imagePath)) {
            await fs.promises.unlink(imagePath); // Using async unlink
            console.log(`Image ${imageNameToServer} deleted successfully`);
            res.send({ status: true, message: "Image deleted successfully." });
        } else {
            console.log(`Image ${imageNameToServer} not found.`);
            res.status(404).send({ status: false, message: "Image not found." });
        }

    } catch (error) {
        res.redirect("/pageerror");
      }
};

module.exports = {
    getProductAddPage,addProducts,getAllProducts,addProductOffer,removeProductOffer,blockProduct,unblockProduct,getEditProduct,editProduct,deleteSingleImage
}
