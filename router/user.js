const express = require("express");
const {
    userRegister,

} = require("../controler/userControler");

const router = express.Router();

router.post("/register", userRegister);

module.exports = router;