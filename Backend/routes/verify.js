const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const pdfParse = require('pdf-parse'); // ADDED for reliable text extraction
const Application = require('../models/Application');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const { sendResponse } = require('../utils/response');

// Multer memory storage (don't save file, just process buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// ============================================================================
// POST /api/verify/auto — NEW
// Upload PDF → scan raw buffer for JDCOEM ID → verify hash automatically
// ============================================================================
router.post('/auto', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) return sendResponse(res, 400, false, null, 'No file uploaded');

    let applicationId = null;
    try {
      // Use pdf-parse instead of raw buffer extraction
      const pdfData = await pdfParse(req.file.buffer);
      const match = pdfData.text.match(/(Application ID:|Application No:)\s*([A-Z0-9\-\/]+)/i);
      if (match) applicationId = match[2].trim();
    } catch (parseErr) {
      console.error('PDF Parse error:', parseErr);
      return sendResponse(res, 400, false, null, 'Could not parse the uploaded PDF file');
    }

    if (!applicationId) {
      return sendResponse(res, 422, false, null, 'This PDF was not issued by JDCOEM DigiSecure — no embedded ID found');
    }

    const doc = await Document.findOne({ applicationId });
    if (!doc) {
      return sendResponse(res, 404, false, { applicationId, match: false, reason: 'Document not found in database' }, `No issued document found for ID: ${applicationId}`);
    }

    const uploadedHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const match = (uploadedHash === doc.fileHash);

    const application = await Application.findOne({ applicationId }).populate('studentId', 'name email');
    const logs = application ? await AuditLog.find({ applicationId: application._id }).sort({ timestamp: 1 }) : [];

    const timeline = logs.map(log => ({
      actor: log.actorRole.charAt(0).toUpperCase() + log.actorRole.slice(1),
      action: log.action,
      timestamp: log.timestamp,
      comment: log.meta?.comment || ''
    }));

    const result = {
      match,
      applicationId,
      studentName: application?.extraData?.name || application?.studentId?.name || 'Unknown',
      documentType: application?.applicationType || 'Official Document',
      status: application?.status || 'Unknown',
      issuedAt: doc.issuedAt,
      originalHash: doc.fileHash,
      uploadedHash,
      verifiedAt: new Date(),
      timeline
    };

    const message = match ? '✅ Document is authentic — original and unmodified' : '❌ Document integrity failed — file has been tampered or modified';
    sendResponse(res, 200, true, result, message);
  } catch (error) {
    console.error('Auto-verify error:', error);
    sendResponse(res, 500, false, null, 'Server error during verification');
  }
});

// ============================================================================
// POST /api/verify/integrity — UNCHANGED
// ============================================================================
router.post('/integrity', upload.single('document'), async (req, res) => {
  try {
    const { applicationId } = req.body;
    if (!req.file) return sendResponse(res, 400, false, null, 'No file uploaded');
    if (!applicationId) return sendResponse(res, 400, false, null, 'Application ID missing');

    const doc = await Document.findOne({ applicationId: decodeURIComponent(applicationId) });
    if (!doc) return sendResponse(res, 404, false, null, 'No issued document found for this ID');

    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const match = (hash === doc.fileHash);

    const result = { match, originalHash: doc.fileHash, uploadedHash: hash, verifiedAt: new Date() };

    if (match) {
      sendResponse(res, 200, true, result, 'Document Integrity Verified: FILE IS ORIGINAL');
    } else {
      sendResponse(res, 200, true, result, 'INTEGRITY FAILED: FILE HAS BEEN TAMPERED');
    }
  } catch (error) {
    console.error('Integrity Check error:', error);
    sendResponse(res, 500, false, null, 'Server error during integrity check');
  }
});

// ============================================================================
// GET /api/verify/data/:applicationId — Data lookup for Frontend UI
// ============================================================================
router.get(new RegExp('^/data/(.*)'), async (req, res) => {
  try {
    let applicationId = decodeURIComponent(req.params[0]).replace(/^\//, '');
    console.log(`[VERIFY-DATA] Looking up: "${applicationId}"`);
    
    const doc = await Document.findOne({ applicationId });

    if (!doc) {
      console.warn(`[VERIFY-DATA] Document not found: "${applicationId}"`);
      return sendResponse(res, 404, false, null, 'Document not found or invalid');
    }

    const application = await Application.findOne({ applicationId }).populate('studentId', 'name email');
    const logs = await AuditLog.find({ applicationId: application?._id }).sort({ timestamp: 1 });

    const timeline = logs.map(log => ({
      actor: log.actorRole.charAt(0).toUpperCase() + log.actorRole.slice(1),
      action: log.action,
      timestamp: log.timestamp,
      comment: log.meta?.comment || ''
    }));

    const result = {
      applicationId: doc.applicationId,
      studentName: application?.extraData?.name || application?.studentId?.name || 'Unknown',
      documentType: application?.applicationType || 'Official Document',
      issuedAt: doc.issuedAt,
      fileHash: doc.fileHash,
      status: application?.status || 'Unknown',
      timeline: timeline
    };

    sendResponse(res, 200, true, result, 'Document identity verified');
  } catch (error) {
    console.error('[VERIFY-DATA] Error:', error);
    sendResponse(res, 500, false, null, 'Server error during verification');
  }
});

// ============================================================================
// GET /api/verify/:applicationId — Mobile QR scan redirect 
// ============================================================================
router.get(new RegExp('^/(.*)'), (req, res) => {
  const rawId = req.params[0] || '';
  const applicationId = rawId.replace(/^\//, '');
  
  if (!applicationId) {
    return res.status(400).send('Invalid Verification URL: Missing Document ID');
  }

  // Use the same host/port the request came in on (One-Tunnel approach)
  const host = req.get('host');
  const protocol = req.protocol === 'https' ? 'https' : 'http';
  
  // Point to the Frontend path that we are now serving from port 5000
  const redirectUrl = `${protocol}://${host}/Frontend/qr-verify.html?id=${encodeURIComponent(applicationId)}#id=${encodeURIComponent(applicationId)}`;
  
  console.log(`[VERIFY-QR] [${new Date().toISOString()}] Redirecting "${applicationId}" -> ${redirectUrl}`);
  res.redirect(redirectUrl);
});

module.exports = router;