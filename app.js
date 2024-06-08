const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const Message = require('./modal/Message');
const app = express();
const port = process.env.PORT || 5001;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Multer to use Cloudinary for file storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'uploads',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});
const upload = multer({ storage: storage });

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Import and use user router
const userRouter = require('./router/user');
app.use('/api/v1/user', userRouter);

// Configure Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Client Schema and Model
const clientSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  country: String,
  city: String,
  state: String,
  group: String,
  userEmail: String,
});

const Client = mongoose.model('Client', clientSchema);

// Routes
app.post('/api/add_client/:email', async (req, res) => {
  const clientData = req.body;
  console.log('Received client data:', clientData);

  try {
    const userEmail = req.params.email;
    const newClient = new Client({
      ...clientData,
      email: userEmail,
    });

    await newClient.save();
    res.status(200).send('Client added successfully');
  } catch (error) {
    console.error('Error saving client data:', error);
    res.status(400).send('Error saving client data');
  }
});

app.get('/api/clients', async (req, res) => {
  try {
    const clients = await Client.find();
    res.status(200).json(clients);
  } catch (error) {
    res.status(400).json({ message: 'Failed to fetch clients', error });
  }
});

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
    res.status(400).json({ message: 'Failed to fetch clients', error });
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
    res.status(500).json({ message: 'Error deleting client', error });
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
    res.status(500).json({ message: 'Error updating client', error });
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

// Utility functions for sending communications
const sendEmail = async (to, subject, text, attachmentUrl = '') => {
  const email = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    text,
    attachments: attachmentUrl ? [{ filename: 'attachment', path: attachmentUrl }] : [],
  };
  console.log('Sending Email:', email);
  await sgMail.send(email);
};

const sendSms = async (to, body) => {
  const sms = {
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
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

    if (!group) throw new Error('Group (phone number or email) is required');

    let attachmentUrl = '';
    if (req.file) {
      console.log('Uploading file to Cloudinary...');
      const result = await cloudinary.uploader.upload(req.file.path);
      attachmentUrl = result.secure_url;
      console.log('File uploaded to Cloudinary:', attachmentUrl);
    }

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

    if (messageType === 'email') {
      await sendEmail(group, subject, content, attachmentUrl);
    } else if (messageType === 'sms') {
      await sendSms(group, content);
    } else if (messageType === 'whatsapp') {
      await sendWhatsapp(group, content);
    }

    res.status(200).send('Message sent and saved successfully.');
  } catch (error) {
    console.error('Error sending and saving message:', error);
    res.status(500).send(`Error sending and saving message: ${error.message}`);
  }
});

// Default route
app.use('/', (req, res) => {
  res.send('Hello world');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

module.exports = app;

