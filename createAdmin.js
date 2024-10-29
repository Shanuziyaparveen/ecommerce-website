const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/adminModel'); // Adjust the path accordingly

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/bootsEcom', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Hash the password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create new admin
    const newAdmin = new Admin({
      username: 'admin',
      email: 'admin@gmail.com',
      password: hashedPassword,
      number: '8281984497'
    });

    // Save the admin to the database
    await newAdmin.save();
    console.log('Admin created successfully');
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    mongoose.connection.close(); // Close the connection when done
  }
};

// Run the function
createAdmin();
