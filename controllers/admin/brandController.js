const { captureRejectionSymbol } = require("connect-mongo");
const Brand=require("../../models/brandSchema")
const Product=require("../../models/productSchema")

const getBrandPage = require=async (req, res) => {
    try {
        const page= parseInt(req.query.page)||1;
        const limit=4;
        const skip=(page-1)*limit;
        const brandData = await Brand.find({}).sort({createdAt:-1}).skip(skip).limit(limit)
        const totalBrands= await Brand.countDocuments();
        const totalPages= Math.ceil(totalBrands/limit);
        const reverseBrand = brandData.reverse();
        res.render('brands',{
data: reverseBrand,
currentPage:page,
totalPages:totalPages,
totalBrands:totalBrands
        })
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}
const addBrand = async (req, res) => {
  try {
      const brand = req.body.name.trim(); // Trim whitespace
      const findBrand = await Brand.findOne({ brandName: { $regex: `^${brand}$`, $options: "i" } });

      if (findBrand) {
          return res.json({ success: false, message: "Brand name already exists!" });
      }

      const image = req.file.filename;
      const newBrand = new Brand({
          brandName: brand,
          brandImage: image,
      });

      await newBrand.save();
      res.json({ success: true, message: "Brand added successfully!" });
  } catch (error) {
      console.error("Error adding brand:", error);
      res.json({ success: false, message: "Something went wrong!" });
  }
};


const blockBrand = async (req, res) => {
    try {
        const id = req.query.id;
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/brands")
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

const unBlockBrand = async (req, res) => {
try {
    const id = req.query.id;
    await Brand.updateOne({_id:id},{$set:{isBlocked:false}})
    res.redirect("/admin/brands")
    
} catch (error) {
    res.redirect("/admin/pageerror")
}
}
const editBrand = async (req, res) => {
    try {
      const { id } = req.params; // Use the id parameter from the route
      if (!id) {
        return res.status(400).redirect("/admin/pageerror"); // If no id, redirect
      }
  
      const brand = await Brand.findById(id); // Fetch the brand by id
      if (!brand) {
        return res.status(404).redirect("/admin/pageerror"); // If no brand found, redirect
      }
  
      // Render the edit page with the brand details
      res.render("editBrand", { brand });
    } catch (error) {
      console.error(error);
      res.redirect("/admin/pageerror");
    }
  };
  
  const updateBrand = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const image = req.file ? req.file.filename : null;

        // Check if brand name already exists (excluding the current brand ID)
        const existingBrand = await Brand.findOne({ brandName: name, _id: { $ne: id } });

        if (existingBrand) {
            return res.json({ success: false, message: "Brand name already exists!" });
        }

        // Prepare update data
        const updateData = { brandName: name };
        if (image) {
            updateData.brandImage = [image];
        }

        await Brand.findByIdAndUpdate(id, updateData);
        return res.json({ success: true, message: "Brand updated successfully!" });

    } catch (error) {
        return res.json({ success: false, message: "Something went wrong!" });
    }
};

  
  
module.exports={
    getBrandPage,addBrand,blockBrand,unBlockBrand,editBrand,updateBrand
}