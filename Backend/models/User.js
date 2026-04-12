const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['student', 'clerk', 'hod', 'principal', 'admin'],
    required: true,
  },
  signatureUrl: {
    type: String, // Path to the signature image file
  },
  // Profile Fields
  dob: { type: String },
  gender: { type: String },
  address: { type: String },
  mobile: { type: String },
  branch: { type: String },
  programme: { type: String, default: 'Bachelor of Engineering (B.E.)' },
  year: { type: String },
  semester: { type: String },
  section: { type: String },
  btid: { type: String },
  prn: { type: String },
  admission_year: { type: String },
  photo_url: { type: String },
  // College Fields
  college_name: { type: String, default: 'JD College of Engineering and Management' },
  college_status: { type: String, default: 'Autonomous Institute' },
  university: { type: String, default: 'RTMNU' },
  city: { type: String, default: 'Nagpur' },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('User', userSchema);
