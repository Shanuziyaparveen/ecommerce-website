const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  category: { 
    type: String, 
    required: true, 
    unique: true, // Ensures no duplicate category names
    trim: true // Removes any trailing spaces
  },
  isDeleted: { 
    type: Boolean, 
    default: false // To mark whether the category is deleted (soft delete)
  }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

module.exports = mongoose.model('Category', categorySchema);
