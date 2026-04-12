const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicationId: {
    type: String,
    required: true,
    unique: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  applicationType: {
    type: String, // e.g., 'Bonafide', 'Leaving Certificate'
    required: true,
    default: 'General Document',
  },
  purpose: {
    type: String,
    default: 'Not specified',
  },
  extraData: {
    type: mongoose.Schema.Types.Mixed, // Stores dynamic JSON form fields securely
    default: {},
  },
  uploadedProofs: [{
    documentName: String, // e.g., 'Fees Receipt', 'ID Card'
    fileUrl: String,      // The path to access the file
  }],
  status: {
    type: String,
    enum: ['pending', 'clerk_approved', 'hod_approved', 'principal_approved', 'rejected'],
    default: 'pending',
  },
  clerkReview: {
    comment: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: Date,
  },
  hodReview: {
    comment: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: Date,
  },
  principalReview: {
    comment: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: Date,
  },
  trackingId: {
    type: String,
    required: true,
    unique: true,
  }
}, { timestamps: true });

module.exports = mongoose.model('Application', applicationSchema);
