const User = require("../../models/userSchema")
const mongoose=require("mongoose")
const bcrypt= require("bcrypt")


const pageerror= async(req,res)=>{
    res.render("admin-error")
}

const loadLogin=(req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }
    res.render("admin-login",{message:null})
}
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                req.session.admin = true;
                return res.redirect("/admin");
            } else {
                // Redirect to login page if password doesn't match
                return res.redirect("/login");
            }
        } else {
            // Redirect if no admin found
            return res.redirect("/login");
        }
    } catch (error) {
        console.log('login error', error);
        return res.redirect("/pageerror");
    }
};
const loadDashboard = async (req, res) => {
    if (req.session.admin) {
        try {
            return res.render("dashboard"); // Ensure "dashboard" exists in "views/admin"
        } catch (error) {
            console.error('Dashboard load error:', error);
            return res.redirect("/pageerror");
        }
    } else {
        return res.redirect("/admin/login");
    }
};


const logout=async(req,res)=>{
    try{
        req.session.destroy((err)=>{
            if(err){
                console.log('session destruction error',err.message);
                return res.redirect("/pageNotFound")
            }
            return res.redirect("/admin/login")
        })
    }catch(error){
        console.log('logout error',error);
       response.redirect("/pageerror")
    }
}
// const getProductDetail =async  (req, res, next) => {
//     Product.findById(req.params.prodId)
//         .then(product => {
//             console.log('prodcut: ', product);
//             res.render('product-detail', { prod: product, pageTitle: 'Product Detail', path: '/', name: 'Edward' });
//         })
//         .catch(err => console.log(err));
// }


module.exports={
    loadLogin,login,loadDashboard,pageerror,logout
}