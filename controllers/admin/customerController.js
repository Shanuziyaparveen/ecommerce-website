const User= require("../../models/userSchema");

const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page);
        }

        const limit = 3;
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { email: { $regex: search, $options: "i" } },
                { name: { $regex: search, $options: "i" } },
            ],
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const count = await User.find({
            isAdmin: false,
            $or: [
                { email: { $regex: search, $options: "i" } },
                { name: { $regex: search, $options: "i" } },
            ],
        }).countDocuments();

        const totalPages = Math.ceil(count / limit);

        // Render the customers view with necessary data
        res.render("customers", {
            data: userData,         // Pass the customer data to the view
            totalPages: totalPages,  // Total number of pages for pagination
            currentPage: page,       // Current page for highlighting
        });

    } catch (error) {
        console.log("Error in customerInfo", error);
        res.status(500).send("Server error");
    }
};

const customerBlocked =async (req,res) => {
    try {
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect("/pageerror")
    }
}
const customerunBlocked = async (req, res) => {
    try {
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect("/pageerror")
    }
}

module.exports ={
    customerInfo,customerBlocked,customerunBlocked
}