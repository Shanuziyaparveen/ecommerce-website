const mongoose = require('mongoose');
const env=require('dotenv').config(); // Load environment variables from .env file

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Keep this if you want a timeout on server selection
    });
    console.log('MongoDB Connected');
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);  // Exit process if connection fails
  }
};

module.exports = connectDB;
