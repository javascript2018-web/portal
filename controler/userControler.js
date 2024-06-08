const UserDB = require("../modal/userModal");
const sendToken = require("../utilitis/sendToken");

exports.userRegister = async (req, res, next) => {
    const { fullName, email, password, userId } = req.body;
    console.log(req.body);
  
    try {
      const user = await UserDB.findOne({ email });
      if (user) {
        return res
          .status(202)
          .send({ success: false, message: "User already exists" });
      }
  
      const saltRounds = 10;
      const salt = await bcrypt.genSalt(saltRounds);
      console.log("Generated Salt:", salt);
  
      const hashedPassword = await bcrypt.hash(`${password}`, salt);
      console.log("Hashed Password:", hashedPassword);
  
      const addedUser = await UserDB.create({
        fullName,
        email,
        password: hashedPassword,
        userId: userId,
      });
  
      sendToken(addedUser, 200, res);
    } catch (e) {
      console.log(e);
      res.status(500).send({ success: false, message: "Server Error" });
}}