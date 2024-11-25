const { response } = require("express");
const Category=require("../../models/categorySchema")
const Product = require("../../models/productSchema")

const { renderAdminErrorPage } = require("../../utils/errorHandler");
const categoryInfo = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 4;
      const skip = (page - 1) * limit;
  
      // Retrieve categories that have non-empty names and descriptions
      const categoryData = await Category.find({ name: { $ne: null }, description: { $ne: null } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
  
      // Calculate total number of valid categories
      const totalCategories = await Category.countDocuments({ name: { $ne: null }, description: { $ne: null } });
      const totalPages = Math.ceil(totalCategories / limit);
  
      res.render("category", {
        cat: categoryData,
        currentPage: page,
        totalPages: totalPages,
        totalCategories: totalCategories
      });
    } catch (error) {
      console.error(error);
      renderAdminErrorPage(res, "Failed to load categories.");    }
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
  
  
// Add Category Offer
const addCategoryOffer = async (req, res) => {
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);

    if (!category) {
      return renderAdminErrorPage(res, "Category not found.");
    }

    const products = await Product.find({ category: category._id });
    const hasProductOffer = products.some(product => product.productOffer > percentage);

    if (hasProductOffer) {
      return renderAdminErrorPage(res, "A product in this category already has a higher offer.");
    }

    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });

    for (const product of products) {
      product.productOffer = 0;
      product.salePrice = product.regularPrice;
      await product.save();
    }

    res.json({ success: true });
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

// Edit Category
const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { categoryName, description } = req.body;

    const existingCategory = await Category.findOne({ name: categoryName });
    if (existingCategory) {
      return renderAdminErrorPage(res, "Category already exists.");
    }

    const updateCategory = await Category.findByIdAndUpdate(
      id,
      { name: categoryName, description },
      { new: true }
    );

    if (updateCategory) {
      res.redirect("/admin/category");
    } else {
      renderAdminErrorPage(res, "Category not found.");
    }
  } catch (error) {
    console.error("Error editing category:", error);
    renderAdminErrorPage(res, "Failed to edit category.");
  }
};

module.exports = {
    categoryInfo,addCategory,addCategoryOffer,removeCategoryOffers,getListCategory,getUnlistCategory,getEditCategory,editCategory
}