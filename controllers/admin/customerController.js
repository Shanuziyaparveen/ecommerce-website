const User= require("../../models/userSchema");
const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }

        let page = 1; // Default page is 1
        if (req.query.page) {
            page = parseInt(req.query.page);
            if (isNaN(page) || page < 1) {
                page = 1; // Fallback to 1 if the input is invalid or negative
            }
        }

        const limit = 3; // Number of records per page

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
            data: userData,       
            totalPages: totalPages,  
            currentPage: page,      
        });

    } catch (error) {
        console.log("Error in customerInfo", error);
        res.status(500).send("Server error");
    }
};
const customerBlocked = async (req, res) => {
    try {
        let id = req.query.id;

        // Update the user's status to blocked
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });

        // If the blocked user is the logged-in user, log them out
        if (req.user && req.user._id.toString() === id) {
            req.logout((err) => {
                if (err) {
                    return next(err);
                }
                res.redirect('/login'); // Redirect to login page after logout
            });
        } else {
            res.redirect("/admin/users"); // Admin panel redirect after blocking another user
        }

    } catch (error) {
        console.error(error);
        res.redirect("/admin/pageerror");
    }
};

const customerunBlocked = async (req, res) => {
    try {
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect("/admin/pageerror")
    }
}

module.exports ={
    customerInfo,customerBlocked,customerunBlocked
}