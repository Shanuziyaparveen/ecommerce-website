const { response } = require("express");
const Category=require("../../models/categorySchema")
const Product = require("../../models/productSchema")

const { renderAdminErrorPage } = require("../../utils/errorHandler");
const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    // Extract search query
    const search = req.query.search || "";

    // Build the filter criteria
    const filter = {
      name: { $ne: null },
      description: { $ne: null },
      ...(search && {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ],
      }),
    };

    // Retrieve categories based on filter
    const categoryData = await Category.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Calculate total number of valid categories
    const totalCategories = await Category.countDocuments(filter);
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("category", {
      cat: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
      search, // Pass the search term to the view
    });
  } catch (error) {
    console.error(error);
    renderAdminErrorPage(res, "Failed to load categories.");
  }
};

  const addCategory = async (req, res) => {
    const { name, description } = req.body;
  
    // Check if 'name' is valid
    if (!name) {
    return renderAdminErrorPage(res, "Category name is required.");
    }
  
    try {
      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return renderAdminErrorPage(res, "Category already exists.");
      }
  
      const newCategory = new Category({ name, description });
      await newCategory.save();
      return res.json({ message: "Category added successfully" });
    } catch (error) {
      console.error("Error adding category:", error);
      renderAdminErrorPage(res, "Failed to add the category.");    }
  };
  
  const addCategoryOffer = async (req, res) => {
    try {
      const percentage = parseInt(req.body.percentage);
      const categoryId = req.body.categoryId;
  
      console.log('Incoming request data:', req.body);
  
      // Fetch category by ID
      const category = await Category.findById(categoryId);
      
      if (!category) {
        console.log("Category not found.");
        return renderAdminErrorPage(res, "Category not found.");
      }
      console.log("Found category:", category);
  
      // Find products belonging to the category
      const products = await Product.find({ category: category.name });
  
      console.log(`Found ${products.length} products in this category.`);
  
      if (products.length === 0) {
        console.log("No products found in this category.");
        return renderAdminErrorPage(res, "No products found in this category.");
      }
  
      // Update category offer
      console.log(`Updating category offer for ${category.name} to ${percentage}%`);
      await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });
      console.log(`Category offer updated to ${percentage}% for ${category.name}`);
  
      // Apply offer to the products and calculate the new sale price
      const bulkOps = products.map(product => {
        // Calculate the discount amount
        const discountAmount = (product.regularPrice * percentage) / 100;
        
        // Apply Math.floor to the new sale price
        const newSalePrice = Math.floor(product.regularPrice - discountAmount);
  
        // Update the product with the new sale price
        return {
          updateOne: {
            filter: { _id: product._id },
            update: {
              $set: {
                productOffer: percentage,       // Set the offer percentage on the product
                salePrice: newSalePrice,         // Update the sale price after discount
              }
            }
          }
        };
      }).filter(op => op !== null); // Remove null operations
  
      if (bulkOps.length > 0) {
        await Product.bulkWrite(bulkOps);
        console.log(`Applied offer to ${bulkOps.length} products.`);
      }
  
      res.json({ success: true, message: `Category offer applied to all products in the ${category.name} category.` });
    } catch (error) {
      console.error("Error adding category offer:", error);
      renderAdminErrorPage(res, "Failed to add category offer.");
    }
  };
  
  
// Remove Category Offers
const removeCategoryOffers = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return renderAdminErrorPage(res, "Category not found.");
    }

    const percentage = category.categoryOffer;
    const products = await Product.find({ category: category._id });

    if (products.length > 0) {
      for (const product of products) {
        product.salePrice += Math.floor(product.regularPrice * (percentage / 100));
        product.productOffer = 0;
        await product.save();
      }
    }

    category.categoryOffer = 0;
    await category.save();
    res.json({ status: true });
  } catch (error) {
    console.error("Error removing category offers:", error);
    renderAdminErrorPage(res, "Failed to remove category offers.");
  }
};

// List Category
const getListCategory = async (req, res) => {
  try {
    const id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error listing category:", error);
    renderAdminErrorPage(res, "Failed to list category.");
  }
};

// Unlist Category
const getUnlistCategory = async (req, res) => {
  try {
    const id = req.query.id;
    
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });

    res.redirect("/admin/category");
  } catch (error) {
    console.error("Error unlisting category:", error);
    renderAdminErrorPage(res, "Failed to unlist category.");
  }
};

// Get Edit Category
const getEditCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const category = await Category.findById({ _id: id });
    res.render("edit-category", { category });
  } catch (error) {
    console.error("Error fetching category for editing:", error);
    renderAdminErrorPage(res, "Failed to fetch category for editing.");
  }
};
const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { categoryName, description } = req.body;

    const existingCategory = await Category.findOne({ name: categoryName });

    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });  // Send JSON error response
    }

    const updateCategory = await Category.findByIdAndUpdate(
      id,
      { name: categoryName, description },
      { new: true }
    );

    if (updateCategory) {
      return res.json({ success: true, message: "Category updated successfully" }); // Send success response
    } else {
      return res.status(404).json({ error: "Category not found" });
    }
  } catch (error) {
    console.error("Error editing category:", error);
    return res.status(500).json({ error: "Failed to edit category" });
  }
};

module.exports = {
    categoryInfo,addCategory,addCategoryOffer,removeCategoryOffers,getListCategory,getUnlistCategory,getEditCategory,editCategory
}