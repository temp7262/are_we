const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const AuditLog = require('../models/AuditLog');
const verifyToken = require('../middleware/auth');
const roleGuard = require('../middleware/role');
const { sendResponse } = require('../utils/response');
const { generateCertificate } = require('./documents');
const sendEmail = require('../utils/sendEmail');

const notifyStudent = async (app, actionType) => {
  try {
    const student = app.studentId;
    if (!student || !student.email) return;

    let subject = '';
    let message = '';

    const baseMsg = `Dear ${student.name || 'Student'},\n\nUpdate on your ${app.applicationType} application (${app.applicationId}):\n`;
    const footer = `\n\nLogin to the DigiSecure Portal to track details.\n\nRegards,\nJDCOEM DigiSecure Team`;

    if (actionType === 'REJECTED') {
      subject = `Application Rejected: ${app.applicationId}`;
      message = `${baseMsg}Your application has been REJECTED.\nReason: ${app.clerkReview?.comment || app.hodReview?.comment || app.principalReview?.comment || 'Documents not fulfilling requirements.'}${footer}`;
    } else if (actionType === 'CLERK') {
      subject = `Documents Verified: ${app.applicationId}`;
      message = `${baseMsg}Your documents have been verified by the Admin Clerk and forwarded to the HOD for approval.${footer}`;
    } else if (actionType === 'HOD') {
      subject = `HOD Approved: ${app.applicationId}`;
      message = `${baseMsg}The Head of Department has approved your request. It is now pending final Principal signature.${footer}`;
    } else if (actionType === 'PRINCIPAL') {
      subject = `Certificate Issued: ${app.applicationId}`;
      message = `${baseMsg}Congratulations! Your application has received final approval from the Principal. Your digital certificate has been generated and is ready to download in your dashboard.${footer}`;
    }

    if (subject) {
      await sendEmail({ email: student.email, subject, message });
    }
  } catch (err) {
    console.error(`[Email Error] Notification failed for ${app.applicationId}:`, err.message);
  }
};

const writeAuditLog = async (req, action, applicationId, meta) => {
  await AuditLog.create({
    actorId: req.user.id,
    actorRole: req.user.role,
    action,
    applicationId,
    meta
  });
};

// PATCH /api/review/clerk
router.patch('/clerk', verifyToken, roleGuard(['clerk']), async (req, res) => {
  try {
    const { applicationId, comment, action } = req.body; // action: 'approve' | 'reject'
    const app = await Application.findOne({ applicationId });
    if (!app) return sendResponse(res, 404, false, null, 'Application not found');

    const actionStr = action === 'reject' ? 'rejected' : 'clerk_approved';
    app.status = actionStr;
    app.clerkReview = { comment, reviewedBy: req.user.id, date: new Date() };
    await app.save();

    // Notify Student
    const fullApp = await Application.findById(app._id).populate('studentId', 'name email');
    notifyStudent(fullApp, action === 'reject' ? 'REJECTED' : 'CLERK');

    await writeAuditLog(req, `Clerk Action: ${actionStr.toUpperCase()}`, app._id, { comment, applicationId: app.applicationId });
    sendResponse(res, 200, true, app, `Clerk action recorded: ${app.status}`);
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
});

// PATCH /api/review/hod
router.patch('/hod', verifyToken, roleGuard(['hod']), async (req, res) => {
  try {
    const { applicationId, comment, action } = req.body;
    const app = await Application.findOne({ applicationId });
    if (!app) return sendResponse(res, 404, false, null, 'Application not found');

    const actionStr = action === 'reject' ? 'rejected' : 'hod_approved';
    app.status = actionStr;
    app.hodReview = { comment, reviewedBy: req.user.id, date: new Date() };
    await app.save();

    // Notify Student
    const fullApp = await Application.findById(app._id).populate('studentId', 'name email');
    notifyStudent(fullApp, action === 'reject' ? 'REJECTED' : 'HOD');

    await writeAuditLog(req, `HOD Action: ${actionStr.toUpperCase()}`, app._id, { comment, applicationId: app.applicationId });
    sendResponse(res, 200, true, app, `HOD action recorded: ${app.status}`);
  } catch (error) {
    sendResponse(res, 500, false, null, error.message);
  }
});

// PATCH /api/review/principal
router.patch('/principal', verifyToken, roleGuard(['principal']), async (req, res) => {
  try {
    const { applicationId, comment, action } = req.body;
    const app = await Application.findOne({ applicationId });
    if (!app) return sendResponse(res, 404, false, null, 'Application not found');

    const actionStr = action === 'reject' ? 'rejected' : 'principal_approved';
    app.status = actionStr;
    app.principalReview = { comment, reviewedBy: req.user.id, date: new Date() };
    await app.save();

    // Notify Student
    const fullApp = await Application.findById(app._id).populate('studentId', 'name email');
    notifyStudent(fullApp, action === 'reject' ? 'REJECTED' : 'PRINCIPAL');

    if (app.status === 'principal_approved') {
      try { 
        await generateCertificate(app.applicationId); 
        console.log(`[Automation] Certificate generated for ${app.applicationId}`);
      } catch (e) {
        console.error(`[Automation Error] PDF Generation failed for ${app.applicationId}:`, e.message);
      }
    }

    await writeAuditLog(req, `Principal Action: ${actionStr.toUpperCase()}`, app._id, { comment, applicationId: app.applicationId });
    sendResponse(res, 200, true, app, `Principal action recorded. Final Status: ${app.status}`);
  } catch (error) {
    sendResponse(res, 500, false, null, 'Server error');
  }
});

module.exports = router;
