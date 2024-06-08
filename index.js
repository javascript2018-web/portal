const app = require('./app');
const database = require('./database/database');
require('dotenv').config();
const port = process.env.PORT || 5000;

(async () => {
  try {
    await database();
    if (app && typeof app.listen === 'function') {
      app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`Port ${port} is already in use.`);
        } else {
          console.error('Server error:', err);
        }
        process.exit(1);
      });
    } else {
      throw new Error('The app module does not export an Express app instance');
    }
  } catch (error) {
    console.error('Error initializing the application:', error);
    process.exit(1);
  }
})();
