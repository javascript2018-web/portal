const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();
const mongoose = require('mongoose');
const Message = require('./modal/Message');  // Ensure the correct path to your Message model
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const twilio = require('twilio');

// Express app setup
const app = express();
const port = process.env.PORT || 5000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage: storage });

// Middleware setup
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB connection
const dbURI = process.env.DATABASE_URI;

mongoose.connect(dbURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);  // Exit if unable to connect to the database
  });

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Twilio setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Data schemas
const clientSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  country: String,
  city: String,
  state: String,
  group: String,
});

const Client = mongoose.model('Client', clientSchema);

// Route handlers
app.post('/api/add_client/:email', async (req, res) => {
  try {
    const clientData = req.body;
    const userEmail = req.params.email;

    const newClient = new Client({
      ...clientData,
      email: userEmail,
    });

    await newClient.save();
    res.status(200).json({ message: 'Client added successfully' });
  } catch (error) {
    console.error('Error saving client data:', error);
    res.status(400).json({ message: 'Error saving client data', error: error.message });
  }
});

app.get('/api/clients', async (req, res) => {
  try {
    const clients = await Client.find();
    res.status(200).json(clients);
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(400).json({ message: 'Failed to fetch clients', error: error.message });
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
    console.error('Error fetching user clients:', error);
    res.status(400).json({ message: 'Failed to fetch user clients', error: error.message });
  }
});


    app.delete('/api/delete_client/:id', async (req, res) => {
      try {
        const result = await Client.findByIdAndDelete(req.params.id);
        if (!result) {
          return res.status(404).json({ message: 'Client not found' });
        }
        res.json({ message: 'Client deleted successfully' });
      } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ message: 'Error deleting client', error: error.message });
      }
    });
    
    app.put('/api/update_client/:id', async (req, res) => {
      try {
        const { name, phone, email, country, group } = req.body;
        const updatedClient = await Client.findByIdAndUpdate(
          req.params.id,
          { name, phone, email, country, group },
          { new: true }
        );
        if (!updatedClient) {
          return res.status(404).json({ message: 'Client not found' });
        }
        res.json(updatedClient);
      } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ message: 'Error updating client', error: error.message });
      }
    });
    
    app.post('/api/send_email', (req, res) => {
      const { subject, content, recipient } = req.body; // Assuming `recipient` is passed in request body
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: recipient, // Replace 'recipient@example.com' with actual recipient
        subject,
        text: content,
      };
    
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).json({ message: 'Error sending email', error: error.message });
        }
        res.json({ message: 'Email sent successfully', response: info.response });
      });
    });
    
    app.post('/api/send_message', upload.single('attachment'), async (req, res) => {
      res.header('Content-Type', 'application/json');
      try {
        const { subject, content, group, messageType } = req.body;
    
        if (!group) {
          throw new Error('Group (phone number or email) is required');
        }
    
        let attachmentUrl = '';
        if (req.file) {
          const result = await cloudinary.uploader.upload(req.file.path);
          attachmentUrl = result.secure_url;
        }
    
        const newMessage = new Message({
          subject,
          content,
          group,
          attachmentUrl,
          messageType,
        });
    
        await newMessage.save();
    
        if (messageType === 'email') {
          await sendEmail(group, subject, content);
        } else if (messageType === 'sms') {
          await sendSms(group, content);
        } else if (messageType === 'whatsapp') {
          await sendWhatsapp(group, content);
        }
    
        res.json({ message: 'Message sent and saved successfully' });
      } catch (error) {
        console.error('Error sending and saving message:', error);
        res.status(500).json({ message: `Error sending and saving message: ${error.message}` });
      }
    });
    
    // Helper functions for sending messages
    const sendEmail = async (to, subject, text) => {
      const email = {
        to,
        from: process.env.GMAIL_USER,
        subject,
        text,
      };
      await transporter.sendMail(email);
    };
    
    const sendSms = async (to, body) => {
      await client.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to,
        body,
      });
    };
    
    const sendWhatsapp = async (to, message) => {
      await client.messages.create({
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${to}`,
        body: message,
      });
    };
    
    // Default route
    app.use("/", (req, res) => {
      res.send("Hello World");
    });
    
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
    