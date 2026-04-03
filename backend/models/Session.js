const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  keystrokes: [{
    timeBetweenKeys: Number,
    timestamp: Number,
  }],
  snapshots: [{
    text: String,
    timestamp: Number,
  }],
  pasteEvents: [{
    timestamp: Number,
    pastedLength: Number,
  }],
  duration: Number,
}, { timestamps: true });
module.exports = mongoose.model('Session', schema);