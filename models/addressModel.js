const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  houseName: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  district: { type: String, required: true },
  pincode: { type: String, required: true },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // References the User model
    required: true 
  }
});
module.exports = mongoose.model('Address', addressSchema);
