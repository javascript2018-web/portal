const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  subject: String,
  content: String,
  group: String,
  attachmentUrl: String,
  messageType: { type: String, enum: ['email', 'sms', 'whatsapp'] },
});

const Message = mongoose.model('Message', MessageSchema);

module.exports = Message;
