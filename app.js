const express = require("express");
const cors = require("cors");
const app = express();
const Comment = require('./modal/commentModal');
require('dotenv').config();

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true, 
}));

// const cookieParser = require('cookie-parser')....
const fileUpload = require("express-fileupload");
// middelwar
// app.use(cookieParser())
app.use(express.json());

app.use(fileUpload());
app.use(express.static("public"));

// all router
const userRouter = require("./router/user");
const courseRouter = require("./router/courses");
const orderRouter = require("./router/order");
const errorHandeler = require("./utilities/errorHendeler");
const contectHandeler = require("./router/contect");
const subscribeModal = require("./modal/subscribeModal");
const { userLogin } = require("./controler/userControler");
// const commentRouter = require("./router/comment");
app.use("/api/v1/user", userRouter);
app.use("/api/v1/courses", courseRouter);
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/contect", contectHandeler);
// app.use("/api/v1/comment", commentRouter);

// stripe gateway 
const stripe = require('stripe')('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');
app.post('/pay', async (req, res) => {
  const { amount, paymentMethodId } = req.body;
  console.log(amount, "amount ok");
    // Calculate the fee (6% of the original amount)
  const fee = amount * 0.06;

  // Add the fee to the original amount
  const totalAmountWithFee = amount + fee;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountWithFee * 100, // convert amount to cents
      currency: "usd",
      payment_method: paymentMethodId,
      confirm: true,
    });
    res.status(200).json({ message: "Payment successful!" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Payment failed." });
  }
});

app.get("/cancel", (req, res) => res.send("Cancelled"));
// subs server code
const nodemailer = require("nodemailer");

// Create a transporter using Gmail SMTP credentials
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user:"michigansbestgolfdeals@gmail.com",
    pass: "bdgjooyjhwevpgfk",
  },
});

app.post("/api/subscribe", async (req, res) => {
  const { email } = req.body;
  console.log(email);

  // Create the email message
  const userMsg = {
    from: "michigansbestgolfdeals@gmail.com",
    to: "michigansbestgolfdeals@gmail.com",
    subject: "New subscriber",
    text: `${ email } has new subscribed to the mailing list.`,
    html: `<p>${ email } has new subscribed to the mailing list.</p>`
  };

  try {
    // Send the email
    await transporter.sendMail(userMsg);

    // Save subscriber data to your database (if needed)
    const subscriber = new subscribeModal({
      email,
    });
    await subscriber.save();

    res.status(200).json({ message: "Success" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to send email" });
  }
});

// const Comment = mongoose.model('Comment', CommentSchema);
app.post('/commentpost', async (req, res) => {
  try {
    const { text } = req.body;

    // Save the comment to the database with a "pending" status
    const comment = new Comment({ text, status: 'pending' });
    await comment.save();

    res.status(201).json({ success: true, comment: { ...comment.toObject(), status: 'pending' } });
  } catch (error) {
    console.error('Error submitting comment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
app.get('/comments', async (req, res) => {
 try {
    const comments = await Comment.find();
    res.status(200).json({ success: true, comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


// pending function
let pendingcomments = [
  { _id: 1, text: 'Pending comment 1', status: 'pending' },
  { _id: 2, text: 'Pending comment 2', status: 'pending' },
];
app.get('/pendingcomments', async (req, res) => {
  try {
    // Fetch pending comments from the database
    const pendingComments = await Comment.find({ status: 'pending' });

    res.json({ pendingComments });
  } catch (error) {
    console.error('Error fetching pending comments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});
app.put('/approveComment/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Find the comment by ID and update its status to 'approved'
    const comment = await Comment.findByIdAndUpdate(id, { status: 'approved' });

    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    res.status(200).json({ success: true, message: 'Comment approved' });
  } catch (error) {
    console.error('Error approving comment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
app.post('/deletecomment', async (req, res) => {
  const { commentId } = req.body;

  try {
    // Delete the comment from the database by its ID
    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});


app.use("/", (req, res) => {
  res.send("hellw world");
});

app.use(errorHandeler);

module.exports = app;
