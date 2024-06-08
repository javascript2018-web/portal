const mongoose = require("mongoose");
require('dotenv').config();

mongoose.set('strictQuery', false);
const database = () => {
  const uri = process.env.database_uri;

  mongoose
    .connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then((data) => {
      console.log("mongoose was connected");
    })
    .catch((error) => {
      console.log("this is error", error);
    });
};

module.exports = database;
