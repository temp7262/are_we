const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  applicationId: {
    type: String,
    required: true,
  },
  fileHash: {
    type: String,
    required: true,
  },
  qrPayload: {
    type: String,
  },
  pdfPath: {
    type: String,
  },
  downloadCount: {
    type: Number,
    default: 0,
  },
  issuedAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Document', documentSchema);
