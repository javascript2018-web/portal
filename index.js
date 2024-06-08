// index.js
const app = require('./app');  // Ensure the correct path and file name
const database = require('./database/database');

const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const port = process.env.PORT || 5000;

database();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('App Object:', app);  // Check what is actually imported here

if (app && typeof app.listen === 'function') {
  app.listen(port, () => {
    console.log("Server is running on port", port);
  });
} else {
  console.error("The app module does not export an Express app instance");
}
