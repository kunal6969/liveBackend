import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  otp: {
    type: String,
    required: true,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900  // ⏰ Expires after 10 minutes (600 seconds)
  }
});

module.exports =  mongoose.model('Otp', otpSchema);
