const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

require('dotenv').config();

const multer = require('multer');
const app = express();

const upload = multer({ dest: 'uploads/' });


const port = 5000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// all router
const userRouter = require("./router/user");
app.use("/api/v1/user", userRouter);



app.use("/", (req, res) => {
    res.send("hellw world");
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
