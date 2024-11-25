const mongoose = require("mongoose");
const { Schema } = mongoose;

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',  // Reference to the User model
    required: true
  },
  address: [{
    addressType:String,
    name: String,
    street: String,
    landMark: String,
    city: String,
    state: String,
    pincode: String,
    phone: String,
    altPhone: String
  }]
});

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
