const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();
const mongoose = require('mongoose');
const Message = require('./modal/Message');
const multer = require('multer');
const app = express();
const upload = multer({ dest: 'uploads/' });
const port = 5000;

app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// all router
const userRouter = require("./router/user");
app.use("/api/v1/user", userRouter);

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;


// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});


const clientSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    country: String,
    city: String,
    state: String,
    group: String,
    userEmail: String

});
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});



const Client = mongoose.model('Client', clientSchema);

app.post('/api/add_client/:email', async (req, res) => {
    const clientData = req.body;
    console.log("Received client data:", clientData);
  
    try {
      const userEmail = req.params.email;
      const newClient = new Client({
        ...clientData,
        email: userEmail, 
      });
  
      await newClient.save();
      res.status(200).send('Client added successfully');
    } catch (error) {
      console.error("Error saving client data:", error);
      res.status(400).send('Error saving client data');
    }
  });

// Get Clients all admin dashboard
app.get('/api/clients', async (req, res) => {
    try {
        const clients = await Client.find();
        res.status(200).json(clients);
    } catch (error) {
        res.status(400).json({ message: 'Failed to fetch clients' });
    }
});

// Define the /api/user_clients endpoint


// all message
app.get('/api/allmessage', async (req, res) => {
    try {
      const messages = await Message.find();
      res.status(200).json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

app.get('/api/user_clients', async (req, res) => {
    try {
      const userEmail = req.query.email; 
  
      if (!userEmail) {
        return res.status(400).json({ message: 'Email query parameter is required.' });
      }
  
      const clients = await Client.find({ email: userEmail });
      res.status(200).json(clients);
    } catch (error) {
      console.error('Error fetching clients:', error);
      res.status(400).json({ message: 'Failed to fetch clients' });
    }
  });

// Delete client
app.delete('/api/delete_client/:id', async (req, res) => {
    try {
      const result = await Client.findByIdAndDelete(req.params.id);
      if (!result) {
        return res.status(404).send({ message: 'Client not found' });
      }
      res.send({ message: 'Client deleted successfully' });
    } catch (error) {
      res.status(500).send({ message: 'Error deleting client', error });
    }
  });

  // Update client
app.put('/api/update_client/:id', async (req, res) => {
    try {
      const { name, phone, email, country, group } = req.body;
      const updatedClient = await Client.findByIdAndUpdate(
        req.params.id,
        { name, phone, email, country, group },
        { new: true }
      );
      if (!updatedClient) {
        return res.status(404).send({ message: 'Client not found' });
      }
      res.send(updatedClient);
    } catch (error) {
      res.status(500).send({ message: 'Error updating client', error });
    }
  });


// Send Email
app.post('/api/send_email', (req, res) => {
  const { subject, content, group } = req.body;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: 'recipient@example.com', // Replace with actual recipient
    subject,
    text: content,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return res.status(500).send(error.toString());
    }
    res.send('Email sent: ' + info.response);
  });
});

// ----------Communication--------------
// Send SMS
const client = require('twilio')(accountSid, authToken);


  const sendEmail = async (to, subject, text) => {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    const email = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL,
      subject,
      text,
    };
    console.log('Sending Email:', email);
    await sgMail.send(email);
  };
  
  const sendSms = async (to, body) => {
    let sms = {
      from: process.env.TWILIO_PHONE_NUMBER,
      to: "+14324380699",
      body,
    };
    console.log('Sending SMS:', sms);
    await client.messages.create(sms);
  };
  
  const sendWhatsapp = async (to, message) => {
    const whatsapp = {
      body: message,
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${to}`,
    };
    console.log('Sending WhatsApp message:', whatsapp);
    await client.messages.create(whatsapp);
  };
  
  app.post('/api/send_message', upload.single('attachment'), async (req, res) => {
    res.header('Content-Type', 'application/json');
    try {
      const { subject, content, group, messageType } = req.body;
      console.log('Initial Request Body:', req.body);
  
      // Ensure empty group is handled
      if (!group) {
        throw new Error('Group (phone number or email) is required');
      }
  
      let attachmentUrl = '';
      if (req.file) {
        console.log('Uploading file to Cloudinary...');
        const result = await cloudinary.uploader.upload(req.file.path);
        attachmentUrl = result.secure_url;
        console.log('File uploaded to Cloudinary:', attachmentUrl);
      }
  
      // Save the message to the database
      const newMessage = new Message({
        subject,
        content,
        group,
        attachmentUrl,
        messageType,
      });
  
      console.log('Saving message to database:', newMessage);
      await newMessage.save();
      console.log('Message saved to database');
  
      // Send message based on type
      if (messageType === 'email') {
        await sendEmail(group, subject, content);
      } else if (messageType === 'sms') {
        await sendSms(subject, content);
      } else if (messageType === 'whatsapp') {
        await sendWhatsapp(subject, content);
      }
    res.status(200).send('Message sent and saved successfully.');
  } catch (error) {
    console.error('Error sending and saving message:', error);
    res.status(500).send(`Error sending and saving message: ${error.message}`);
  }
});

app.use("/", (req, res) => {
    res.send("hellw world");
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
