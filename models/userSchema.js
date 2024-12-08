const mongoose = require("mongoose");
const {Schema} = mongoose;


const userSchema = new Schema({
    name : {
        type:String,
        required : true
    },
    email: {
        type : String,
        required:true,
        unique: true,
    },
    phone : {
        type : String,
        required: false,
        unique: false,
        sparse:true,
        default:null
    },

    googleId: {
        type : String,
        
    },
    password : {
        type:String,
        required :false
    },
    isBlocked: {
        type : Boolean,
        default:false
    },
    isAdmin : {
        type: Boolean,
        default:false
    },
    cart: [{
        type: mongoose.Schema.Types.ObjectId,
        ref:"Product",
    }],
    wallet: {
        type: Number,
        default: 0,
      },
      transactions: [
        {
            amount: { type: Number },
            type: { type: String }, // 'Refund', 'Payment', etc.
            date: { type: Date, default: Date.now },
            orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
            status: { type: String }, // e.g., 'Used'
          },
      ] ,wishlist:{
        type:Array
    },
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    address: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address'
      }],
    createdOn : {
        type:Date,
        default:Date.now,
    }, referralCode: { type: String, unique: true },
    referredBy: { type: String, default: null }, // tracks who referred them
    rewards: { type: Number, default: 0 },
    redeemed:{
        type:Boolean
    },
    redeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref:"User"
    }],
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref:"Category",
        },
        brand: {
            type : String
        },
        searchOn : {
            type: Date,
            default: Date.now
        }
    }]
   
})
userSchema.methods.generateReferralCode = function() {
    return this.email.split('@')[0] + '-' + Math.random().toString(36).substring(7);
  };

const User = mongoose.model("User",userSchema,'users');

module.exports = User;