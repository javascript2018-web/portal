// index.js
const app = require('./app');
const database = require('./database/database');


require('dotenv').config();
const port = process.env.PORT || 5000;

database();


console.log('App Object:', app);  // Check what is actually imported hereddddddd

if (app && typeof app.listen === 'function') {
  app.listen(port, () => {
    console.log("Server is running on port", port);
  });
} else {
  console.error("The app module does not export an Express app instance");
}
