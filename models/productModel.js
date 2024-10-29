const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    productName: { type: String, required: true },
    description: { type: String }, // Optional description field
    price: { type: Number, required: true },
    salePrice: { type: Number }, // Optional sale price
    stock: { type: Number, required: true },
    sizesAvailable: { type: [String], required: true }, // Array of available sizes
    availableColors: { type: [String], required: true }, // Array of available colors
    images: { type: [String] }, // Store image URLs or file paths
    isDeleted: {
        type: Boolean,
        default: false, // New products are not deleted by default
    },
}, { timestamps: true }); // Add timestamps for createdAt and updatedAt

module.exports = mongoose.model('Product', productSchema);
