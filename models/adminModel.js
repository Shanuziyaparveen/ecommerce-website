const mongoose = require('mongoose'); 
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  number: { 
    type: String, 
    required: true, 
    unique: true 
  }
});

// Method to compare passwords
adminSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// Create the Admin model
const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
