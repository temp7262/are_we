const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');
const verifyToken = require('../middleware/auth');
const roleGuard = require('../middleware/role');
const { sendResponse } = require('../utils/response');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getNextSequence } = require('../utils/counter');
const sendEmail = require('../utils/sendEmail');

// Ensure uploads folder exists
if (!fs.existsSync('./uploads/proofs')) {
  fs.mkdirSync('./uploads/proofs', { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/proofs/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
// Allow up to 5 files (e.g., photo + fees receipt), Max 5MB per file
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/applications (Student submits application with documents)
router.post('/', verifyToken, roleGuard(['student']), upload.array('proofDocs', 5), async (req, res) => {
  try {
    const { applicationType, purpose, extraData } = req.body; 
    const trackingId = crypto.randomUUID();
    const year = new Date().getFullYear();
    const seq = await getNextSequence('applicationId');
    const applicationId = `JDCOEM/${year}/${String(seq).padStart(4, '0')}`; 
    
    // Map uploaded files to our Schema
    const uploadedProofs = (req.files || []).map(file => ({
      documentName: file.originalname,
      fileUrl: file.path // Save the local path (or cloud URL later)
    }));
    
    // Parse dynamic JSON safely if provided
    let parsedExtraData = {};
    if (extraData) {
      try { parsedExtraData = JSON.parse(extraData); } catch(e) {}
    }

    const newApp = new Application({
      applicationId,
      studentId: req.user.id,
      applicationType: applicationType || 'General Document',
      purpose: purpose || 'Not specified',
      extraData: parsedExtraData,
      uploadedProofs,
      trackingId,
      status: 'pending' // default
    });
    await newApp.save();

    // Log the initial audit event
    await AuditLog.create({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'Application Submitted',
      applicationId: newApp._id,
      meta: { applicationId: newApp.applicationId, status: 'pending' }
    });

    // 3. Notify Student asynchronously
    sendEmail({
      email: req.user.email,
      subject: `Application Received: ${newApp.applicationId}`,
      message: `Dear ${req.user.name || 'Student'},\n\nYour application for ${newApp.applicationType} has been successfully received.\nApplication ID: ${newApp.applicationId}\n\nYou can track the live status of your request on the DigiSecure Portal.\n\nRegards,\nJDCOEM DigiSecure Team`
    }).catch(err => console.error(`[Email Error] Submission notification failed for ${req.user.email}:`, err.message));

    sendResponse(res, 201, true, { trackingId, applicationId }, 'Application submitted successfully');

  } catch (error) {
    sendResponse(res, 500, false, null, 'Server error');
  }
});

// GET /api/applications/my
router.get('/my', verifyToken, roleGuard(['student']), async (req, res) => {
  try {
    const apps = await Application.find({ studentId: req.user.id }).sort({ createdAt: -1 });
    sendResponse(res, 200, true, apps, 'User applications fetched');
  } catch (error) {
    sendResponse(res, 500, false, null, 'Server error');
  }
});

// GET /api/applications/all (Admin/Staff fetches everything)
router.get('/all', verifyToken, roleGuard(['clerk', 'hod', 'principal', 'admin']), async (req, res) => {
  try {
    const apps = await Application.find()
      .populate('studentId', 'name btid branch email year')
      .sort({ createdAt: -1 });
    console.log(`[API Debug] Successfully fetched ${apps.length} applications`);
    sendResponse(res, 200, true, apps, 'All applications fetched successfully');
  } catch (error) {
    sendResponse(res, 500, false, null, 'Server error');
  }
});

// GET /api/applications/:id/status
router.get('/:id/status', verifyToken, async (req, res) => {
  try {
    const app = await Application.findOne({ applicationId: req.params.id });
    if (!app) return sendResponse(res, 404, false, null, 'Application not found');

    const history = await AuditLog.find({ applicationId: app._id }).sort({ timestamp: -1 });
    sendResponse(res, 200, true, { status: app.status, history }, 'Status fetched');
  } catch (error) {
    sendResponse(res, 500, false, null, 'Server error');
  }
});

module.exports = router;
