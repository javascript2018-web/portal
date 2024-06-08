const mongoose = require('mongoose');
require('dotenv').config();

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);  // Exit if unable to connect to the database
  }
};

module.exports = connectDatabase;

