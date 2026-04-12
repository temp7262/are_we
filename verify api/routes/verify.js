const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const Application = require('../models/Application');
const Document = require('../models/Document');
const AuditLog = require('../models/AuditLog');
const { sendResponse } = require('../utils/response');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ============================================================================
// DATABASE CONNECTION CHECK (NEW)
// ============================================================================
const checkDatabaseConnection = async () => {
  try {
    // Attempt a simple query to verify DB is connected
    const count = await Document.countDocuments().limit(1);
    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    return false;
  }
};

// ============================================================================
// GET /api/verify/:applicationId — identity lookup
// ============================================================================
router.get('/:id', async (req, res) => {
  try {
    // Check database connectivity first
    const dbOk = await checkDatabaseConnection();
    if (!dbOk) {
      return sendResponse(res, 503, false, null,
        '⚠️  Server error: Database not connected. Please try again later.');
    }

    const applicationId = decodeURIComponent(req.params.id);
    console.log(`[verify GET] Looking up application: ${applicationId}`);

    const doc = await Document.findOne({ applicationId });

    if (!doc) {
      console.warn(`[verify GET] Document not found: ${applicationId}`);
      return sendResponse(res, 404, false, null,
        `Document not found or invalid (ID: ${applicationId})`);
    }

    const application = await Application.findOne({ applicationId })
      .populate('studentId', 'name email');
    const logs = application
      ? await AuditLog.find({ applicationId: application._id }).sort({ timestamp: 1 })
      : [];

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
      timeline
    };

    sendResponse(res, 200, true, result, 'Document identity verified');
  } catch (err) {
    console.error('❌ Verify error:', err);
    sendResponse(res, 500, false, null, 'Server error during verification');
  }
});

// ============================================================================
// POST /api/verify/auto
// Upload PDF → scan raw buffer for JDCOEM ID → verify hash
// ============================================================================
router.post('/auto', upload.single('document'), async (req, res) => {
  try {
    // Validate file upload
    if (!req.file) {
      console.warn('[verify/auto] No file uploaded');
      return sendResponse(res, 400, false, null, 'No file uploaded');
    }

    console.log(`[verify/auto] Processing file: ${req.file.originalname} (${req.file.size} bytes)`);

    // Check database connectivity BEFORE attempting lookup
    const dbOk = await checkDatabaseConnection();
    if (!dbOk) {
      console.error('[verify/auto] Database connection failed');
      return sendResponse(res, 503, false, null,
        '⚠️  Server error: Database not connected. Cannot verify documents at this time.');
    }

    // ========================================================================
    // Step 1: Scan raw PDF buffer for JDCOEM application ID
    // ========================================================================
    let applicationId = null;
    try {
      const pdfText = req.file.buffer.toString('latin1');
      const match = pdfText.match(/JDCOEM\/\d{4}\/[A-Z]+\/\d+/i);
      if (match) {
        applicationId = match[0].toUpperCase();
      }
      console.log(`[verify/auto] PDF scan result: ${applicationId || 'NO ID FOUND'}`);
    } catch (parseErr) {
      console.error(`[verify/auto] PDF read error: ${parseErr.message}`);
      return sendResponse(res, 400, false, null, 'Could not read PDF file');
    }

    if (!applicationId) {
      console.warn('[verify/auto] PDF has no embedded JDCOEM ID');
      return sendResponse(res, 422, false, null,
        'This PDF was not issued by JDCOEM DigiSecure — no embedded ID found');
    }

    // ========================================================================
    // Step 2: Look up stored document record in database
    // ========================================================================
    const doc = await Document.findOne({ applicationId });
    if (!doc) {
      console.warn(`[verify/auto] No document record found for: ${applicationId}`);
      return sendResponse(res, 404, false, {
        applicationId,
        match: false,
        reason: 'Document not found in database'
      }, `No issued document found for ID: ${applicationId}`);
    }

    console.log(`[verify/auto] Found document record for: ${applicationId}`);

    // ========================================================================
    // Step 3: Compare file hashes
    // ========================================================================
    const uploadedHash = crypto.createHash('sha256')
      .update(req.file.buffer)
      .digest('hex');
    const match = (uploadedHash === doc.fileHash);

    console.log(`[verify/auto] Hash comparison:
      Expected: ${doc.fileHash}
      Uploaded: ${uploadedHash}
      Match:    ${match ? '✅ YES' : '❌ NO'}`);

    // ========================================================================
    // Step 4: Fetch application details and audit timeline
    // ========================================================================
    const application = await Application.findOne({ applicationId })
      .populate('studentId', 'name email');
    const logs = application
      ? await AuditLog.find({ applicationId: application._id }).sort({ timestamp: 1 })
      : [];

    const timeline = logs.map(log => ({
      actor: log.actorRole.charAt(0).toUpperCase() + log.actorRole.slice(1),
      action: log.action,
      timestamp: log.timestamp,
      comment: log.meta?.comment || ''
    }));

    // ========================================================================
    // Step 5: Build response
    // ========================================================================
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
      timeline,
      // Additional debug info for testing
      ...(process.env.NODE_ENV === 'test' && { debug: { dbFound: !!doc, dbHasLogs: logs.length > 0 } })
    };

    const message = match
      ? '✅ Document is authentic — original and unmodified'
      : '❌ Document integrity failed — file has been tampered or modified';

    console.log(`[verify/auto] Verification complete: ${message}`);
    sendResponse(res, 200, true, result, message);

  } catch (err) {
    console.error(`❌ Auto-verify error: ${err.message}`, err);
    sendResponse(res, 500, false, null, 'Server error during verification');
  }
});

// ============================================================================
// POST /api/verify/integrity — backward compatibility
// ============================================================================
router.post('/integrity', upload.single('document'), async (req, res) => {
  try {
    const { applicationId } = req.body;

    // Validation
    if (!req.file) {
      console.warn('[verify/integrity] No file uploaded');
      return sendResponse(res, 400, false, null, 'No file uploaded');
    }
    if (!applicationId) {
      console.warn('[verify/integrity] Application ID missing');
      return sendResponse(res, 400, false, null, 'Application ID missing');
    }

    // Check database
    const dbOk = await checkDatabaseConnection();
    if (!dbOk) {
      return sendResponse(res, 503, false, null,
        '⚠️  Server error: Database not connected.');
    }

    console.log(`[verify/integrity] Checking integrity for: ${applicationId}`);

    const doc = await Document.findOne({ applicationId: decodeURIComponent(applicationId) });
    if (!doc) {
      console.warn(`[verify/integrity] No document found: ${applicationId}`);
      return sendResponse(res, 404, false, null, 'No issued document found for this ID');
    }

    const hash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const match = (hash === doc.fileHash);

    console.log(`[verify/integrity] Match: ${match ? 'YES' : 'NO'}`);

    const result = {
      match,
      originalHash: doc.fileHash,
      uploadedHash: hash,
      verifiedAt: new Date()
    };

    const message = match
      ? 'Document Integrity Verified: FILE IS ORIGINAL'
      : 'INTEGRITY FAILED: FILE HAS BEEN TAMPERED';

    sendResponse(res, 200, true, result, message);

  } catch (err) {
    console.error(`❌ Integrity check error: ${err.message}`, err);
    sendResponse(res, 500, false, null, 'Server error during integrity check');
  }
});

// ============================================================================
// Health check endpoint (NEW)
// ============================================================================
router.get('/health/check', async (req, res) => {
  try {
    const dbOk = await checkDatabaseConnection();
    if (dbOk) {
      const docCount = await Document.countDocuments();
      sendResponse(res, 200, true, {
        database: 'connected',
        documentsInDb: docCount
      }, 'Verification service is ready');
    } else {
      sendResponse(res, 503, false, {
        database: 'disconnected'
      }, 'Database connection failed');
    }
  } catch (err) {
    sendResponse(res, 500, false, null, 'Health check error');
  }
});

module.exports = router;