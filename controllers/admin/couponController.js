const Brand=require("../../models/brandSchema")
const Product=require("../../models/productSchema")
const Category=require("../../models/categorySchema")
const User=require('../../models/userSchema')
const Order=require ("../../models/orderSchema")
const Coupon=require("../../models/couponSchema")






//GET REQUEST FOR ADD-COUPON
const getaddcoupon = (req, res) => {
  res.render("add-coupon",{ err: null });
};
const addCoupon = async (req, res) => {
  try {
    // Parse cashback and minamount to ensure they're numbers
    let { name, couponcode, cashback, minamount, expdate, status } = req.body;
    cashback = parseFloat(cashback);
    minamount = parseFloat(minamount);

    const errors = [];

    if (!name.trim() || !couponcode.trim() || !expdate) {
      errors.push("All fields are required.");
    }

    // Ensure cashback and minamount are valid numbers and the cashback is less than minamount
    if (cashback >= minamount) {
      errors.push("Cashback must be less than the minimum amount.");
    }

    if (cashback < 0 || minamount < 0) {
      errors.push("Cashback and minimum amount cannot be negative.");
    }

    const expiryDate = new Date(expdate);
    if (expiryDate < new Date()) {
      errors.push("Expiry date cannot be a past date.");
    }

    // Debugging: log errors if any
    console.log("Errors found:", errors);

    if (errors.length > 0) {
      return res.render("add-coupon", { err: true, message: errors.join(", ") });
    }

    const coupon = new Coupon({ name, couponcode, cashback, minamount, expdate, status });
    await coupon.save();

    // Debugging: log success
    console.log("Coupon successfully saved:", coupon);

    res.redirect("/admin/coupon");
  } catch (err) {
    console.error("Error occurred while adding coupon:", err);
    res.render("add-coupon", { err: true, message: "Failed to add coupon." });
  }
};
const getCoupon = async (req, res) => {
  try {
    const name = req.query.name || "";
    const page = parseInt(req.query.page) || 1; // Current page
    const limit = 10; // Number of items per page
    const skip = (page - 1) * limit;

    // Fetch coupons with pagination
    const [coupons, totalCoupons] = await Promise.all([
      Coupon.find({
        $or: [
          { name: new RegExp(name, "i") },
          { couponcode: new RegExp(name, "i") },
        ],
      })
        .skip(skip)
        .limit(limit)
        .lean(),
      Coupon.countDocuments({
        $or: [
          { name: new RegExp(name, "i") },
          { couponcode: new RegExp(name, "i") },
        ],
      }),
    ]);

    const totalPages = Math.ceil(totalCoupons / limit);

    res.render("coupons", { coupons, name, page, totalPages });
  } catch (err) {
    console.error("Error fetching coupons:", err);
    res.render("coupons", { coupons: [], name, page: 1, totalPages: 1, message: "Failed to fetch coupons." });
  }
};

// GET REQUEST FOR EDIT-COUPON
const getEditCoupon = async (req, res) => {
  try {
    const _id = req.params.id;
    const coupon = await Coupon.findOne({ _id }).lean();

    if (!coupon) {
      return res.status(404).render("edit-coupon", {
        err: { message: "Coupon not found." }, // Pass an error message if the coupon isn't found
      });
    }

    res.render("edit-coupon", { coupon, err: null });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    res.status(500).render("edit-coupon", {
      err: { message: "Internal Server Error. Please try again later." },
    });
  }
};
const editCoupon = async (req, res) => {
  try {
    const { _id, name, couponcode, cashback, minamount, expdate, status } = req.body;
    const errors = [];

    // Parse cashback and minamount to numbers (to ensure they're numeric)
    const cashbackValue = parseFloat(cashback);
    const minamountValue = parseFloat(minamount);

    // Validate required fields
    if (!name.trim() || !couponcode.trim() || !expdate) {
      errors.push("All fields are required.");
    }

    // Check if cashback and minamount are numbers and cashback is less than minamount
    if (isNaN(cashbackValue) || isNaN(minamountValue)) {
      errors.push("Cashback and minimum amount must be valid numbers.");
    } else if (cashbackValue >= minamountValue) {
      errors.push("Cashback must be less than the minimum amount.");
    }

    // Validate negative values for cashback or minamount
    if (cashbackValue < 0 || minamountValue < 0) {
      errors.push("Values cannot be negative.");
    }

    // Validate expiry date
    const expiryDate = new Date(expdate);
    if (expiryDate < new Date()) {
      errors.push("Expiry date cannot be in the past.");
    }

    // Check if the coupon code is unique when being edited
    if (couponcode) {
      const existingCoupon = await Coupon.findOne({ couponcode: req.body.couponcode });
      if (existingCoupon && existingCoupon._id.toString() !== _id) {
        errors.push("Coupon code already exists.");
      }
    }

    // If there are validation errors, return the response with error message
    if (errors.length > 0) {
      const coupon = await Coupon.findById(_id).lean();
      return res.render("edit-coupon", { coupon, err: true, message: errors.join(", ") });
    }

    // Proceed to update the coupon if no errors
    await Coupon.findByIdAndUpdate(_id, { name, couponcode, cashback: cashbackValue, minamount: minamountValue, expdate, status });
    res.redirect("/admin/coupon"); // Redirect to the coupon list page after successful update

  } catch (err) {
    console.error("Error updating coupon:", err);
    res.render("edit-coupon", { err: true, message: "Failed to update coupon." });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const id = req.params.id;
    await Coupon.findByIdAndDelete(id);
    res.redirect("/admin/coupon");
  } catch (err) {
    console.error(err);
    res.redirect("/admin/coupon?error=Failed to delete coupon");
  }
};

module.exports={getaddcoupon,addCoupon,getCoupon,deleteCoupon,editCoupon,getEditCoupon}