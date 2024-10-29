const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  imageUrl: { 
    type: String, 
    required: true, 
    trim: true // Ensures any trailing spaces are removed from the URL
  },
  description: { 
    type: String, 
    required: true, 
    trim: true // Ensures any trailing spaces are removed from the description
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Banner', bannerSchema);
