const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
require('dotenv').config();
const mongoose = require('mongoose');

const app = express();
const port = 5000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const clients = [];
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const client = new twilio(accountSid, authToken);

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});


const dbURI = process.env.DATABASE_URI; 
mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
});
// Client Schema
const clientSchema = new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    country: String,
    city: String,
    state: String,
    group: String
});

const Client = mongoose.model('Client', clientSchema);
app.post('/api/add_client', async (req, res) => {
    const clientData = req.body;
    console.log(clientData)
    const newClient = new Client(clientData);
    try {
        await newClient.save();
        res.status(200).send('Client added successfully');
    } catch (error) {
        res.status(400).send('Error saving client data');
    }
});

// Get Clients
app.get('/api/clients', async (req, res) => {
    try {
        const clients = await Client.find();
        res.status(200).json(clients);
    } catch (error) {
        res.status(400).json({ message: 'Failed to fetch clients' });
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

// Send SMS
app.post('/api/send_sms', (req, res) => {
  const { content, group } = req.body;
  console.log(req.body)
  // Loop through clients for the selected group
  clients.filter(client => client.group === group).forEach(client => {
    client.messages.create({
      body: content,
      to: client.phone,
      from: twilioPhoneNumber,
    })
      .then((message) => console.log(`SMS sent with SID: ${message.sid}`))
      .catch(error => console.error('Error sending SMS', error));
  });
  res.send('SMS sent');
});

// Send WhatsApp
app.post('/api/send_whatsapp', (req, res) => {
  const { content, group } = req.body;
  // Loop through clients for the selected group
  clients.filter(client => client.group === group).forEach(client => {
    client.messages.create({
      body: content,
      to: `whatsapp:${client.phone}`,
      from: `whatsapp:${twilioPhoneNumber}`,
    })
      .then((message) => console.log(`WhatsApp message sent with SID: ${message.sid}`))
      .catch(error => console.error('Error sending WhatsApp message', error));
  });
  res.send('WhatsApp message sent');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
