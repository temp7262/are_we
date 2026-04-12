/**
 * routes/compat.js
 * ─────────────────────────────────────────────────────────────────
 * Compatibility layer that bridges the PHP-shaped frontend calls
 * to the Node.js backend data. All responses mimic the exact JSON
 * structure the existing frontend JS files expect.
 * ─────────────────────────────────────────────────────────────────
 */

const express    = require('express');
const router     = express.Router();
const path       = require('path');
const fs         = require('fs');
const multer     = require('multer');
const { v4: uuidv4 } = require('uuid');

const User        = require('../models/User');
const Application = require('../models/Application');
const AuditLog    = require('../models/AuditLog');
const verifyToken = require('../middleware/auth');
const roleGuard   = require('../middleware/role');
const { sendResponse } = require('../utils/response');

/* ── Multer setup (mirrors applications.js) ─────────────────── */
if (!fs.existsSync('./uploads/proofs')) {
  fs.mkdirSync('./uploads/proofs', { recursive: true });
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, './uploads/proofs/'),
  filename:    (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/* ════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════ */

/** Map internal Node status → PHP-style status string */
function toPhpStatus(status) {
  const map = {
    pending:             'pending',
    clerk_review:        'clerk_approved',
    clerk_approved:      'clerk_approved',
    hod_review:          'hod_approved',
    hod_approved:        'hod_approved',
    principal_approved:  'approved',
    approved:            'approved',
    rejected:            'rejected',
    rejected_clerk:      'rejected',
    rejected_hod:        'rejected_hod',
    rejected_principal:  'rejected_principal',
  };
  return map[status] || status;
}

/** Shape an Application + its populated student into the PHP format */
function shapeApp(app, student) {
  const s = student || app.studentId || {};  // studentId may already be populated
  const uploadedDocs = (app.uploadedProofs || []).map(d => ({
    file_name:     d.fileUrl     || '',
    original_name: d.documentName || '',
    name:          d.documentName || '',
  }));

  return {
    id:                    app._id,
    application_number:    app.applicationId,
    certificate_type:      (app.applicationType || '').toLowerCase().replace(/\s+/g, '_'),
    certificate_type_name: app.applicationType || 'Document',
    purpose:               app.purpose || '',
    status:                toPhpStatus(app.status),
    created_at:            app.createdAt,
    updated_at:            app.updatedAt,
    // Student fields
    student_name:  s.name  || '',
    student_email: s.email || '',
    bt_id:         s.btid  || '',
    btid:          s.btid  || '',
    department:    s.department || s.branch || '',
    year:          s.year  || '',
    // Review remarks
    clerk_remarks:     app.clerkReview?.comment     || '',
    hod_remarks:       app.hodReview?.comment       || '',
    principal_remarks: app.principalReview?.comment || '',
    clerk_approved_at:     app.clerkReview?.date     || null,
    hod_approved_at:       app.hodReview?.date       || null,
    approved_at:           app.principalReview?.date || null,
    // Documents
    documents: uploadedDocs,
  };
}

/* ════════════════════════════════════════════════════════════════
   AUTH
   ════════════════════════════════════════════════════════════════ */

/**
 * GET /api/auth/me
 * Returns the logged-in user's profile from the JWT.
 * Replaces PHP session-based /auth/me.
 */
router.get('/auth/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return sendResponse(res, 404, false, null, 'User not found');

    return res.json({
      success: true,
      user: {
        id:         user._id,
        name:       user.name,
        full_name:  user.name,
        email:      user.email,
        role:       user.role,
        btid:       user.btid       || null,
        bt_id:      user.btid       || null,
        branch:     user.branch     || null,
        department: user.department || user.branch || null,
        year:       user.year       || null,
        mobile:     user.mobile     || null,
        phone:      user.mobile     || null,
      }
    });
  } catch (err) {
    console.error('[GET /auth/me]', err);
    return sendResponse(res, 500, false, null, 'Server error');
  }
});

/**
 * POST /api/auth/logout
 * JWT is stateless — just return success. Client clears localStorage.
 */
router.post('/auth/logout', (req, res) => {
  return res.json({ success: true, message: 'Logged out' });
});

/* ════════════════════════════════════════════════════════════════
   STUDENT APPLICATION ROUTES
   ════════════════════════════════════════════════════════════════ */

router.post('/application/create', verifyToken, roleGuard(['student']), upload.any(), createApplication);
router.post('/application/store',  verifyToken, roleGuard(['student']), upload.any(), createApplication);

async function createApplication(req, res) {
  try {
    const { certificate_type, purpose, extra_data } = req.body;
    const applicationId = `APP-${Date.now()}`;
    const trackingId    = uuidv4();

    const uploadedProofs = (req.files || []).map(file => ({
      documentName: file.originalname,
      fileUrl:      file.path,
    }));

    const newApp = new Application({
      applicationId,
      studentId:       req.user.id,
      applicationType: certificate_type || 'General Document',
      purpose:         purpose || '',
      uploadedProofs,
      trackingId,
      status: 'pending',
    });
    await newApp.save();

    return res.json({
      success:            true,
      application_number: applicationId,
      tracking_id:        trackingId,
      message:            'Application submitted successfully',
    });
  } catch (err) {
    console.error('[createApplication]', err);
    return sendResponse(res, 500, false, null, 'Server error');
  }
}

/**
 * POST /api/documents/upload
 * PHP multi-step upload: accepts files keyed documents[*]
 * Attaches them to an existing application by application_number.
 */
router.post(
  '/documents/upload',
  verifyToken,
  upload.any(),
  async (req, res) => {
    try {
      const { application_number } = req.body;
      if (!application_number) {
        return res.json({ success: true, message: 'No application_number provided — files ignored' });
      }

      const app = await Application.findOne({ applicationId: application_number });
      if (!app) return sendResponse(res, 404, false, null, 'Application not found');

      const newProofs = (req.files || []).map(file => ({
        documentName: file.originalname,
        fileUrl:      file.path,
      }));

      app.uploadedProofs.push(...newProofs);
      await app.save();

      return res.json({ success: true, message: 'Files uploaded successfully' });
    } catch (err) {
      console.error('[POST /documents/upload]', err);
      return sendResponse(res, 500, false, null, 'Server error');
    }
  }
);

/**
 * GET /api/application/my
 * Returns the authenticated student's own applications in PHP shape.
 */
router.get('/application/my', verifyToken, roleGuard(['student']), async (req, res) => {
  try {
    const apps = await Application.find({ studentId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const student = await User.findById(req.user.id).select('-passwordHash').lean();

    const data = apps.map(a => shapeApp(a, student));

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[GET /application/my]', err);
    return sendResponse(res, 500, false, null, 'Server error');
  }
});

/**
 * GET /api/application/status?application_number=APP-xyz
 * Returns status of a single application by its applicationId string.
 */
router.get('/application/status', verifyToken, async (req, res) => {
  try {
    const { application_number, application_id } = req.query;
    const id = application_number || application_id;
    if (!id) return sendResponse(res, 400, false, null, 'application_number is required');

    const app = await Application.findOne({ applicationId: id })
      .populate('studentId', '-passwordHash')
      .lean();
    if (!app) return sendResponse(res, 404, false, null, 'Application not found');

    return res.json({ success: true, data: shapeApp(app, app.studentId) });
  } catch (err) {
    console.error('[GET /application/status]', err);
    return sendResponse(res, 500, false, null, 'Server error');
  }
});

/* ════════════════════════════════════════════════════════════════
   ADMIN APPLICATION ROUTES
   ════════════════════════════════════════════════════════════════ */

/**
 * GET /api/application/all
 * Admin-only. Returns ALL applications with student info populated.
 */
router.get(
  '/application/all',
  verifyToken,
  roleGuard(['clerk', 'hod', 'principal', 'admin']),
  async (req, res) => {
    try {
      const apps = await Application.find({})
        .populate('studentId', '-passwordHash')
        .sort({ createdAt: -1 })
        .lean();

      const data = apps.map(a => shapeApp(a, a.studentId));
      return res.json({ success: true, data });
    } catch (err) {
      console.error('[GET /application/all]', err);
      return sendResponse(res, 500, false, null, 'Server error');
    }
  }
);

/**
 * GET /api/application/view?application_id=<mongo _id or applicationId>
 * Returns detailed view of a single application for admin modals.
 */
router.get(
  '/application/view',
  verifyToken,
  roleGuard(['clerk', 'hod', 'principal', 'admin']),
  async (req, res) => {
    try {
      const { application_id } = req.query;
      if (!application_id) return sendResponse(res, 400, false, null, 'application_id is required');

      // Support both MongoDB _id and applicationId string (APP-xxx)
      let app;
      if (application_id.match(/^[0-9a-fA-F]{24}$/)) {
        app = await Application.findById(application_id).populate('studentId', '-passwordHash').lean();
      } else {
        app = await Application.findOne({ applicationId: application_id }).populate('studentId', '-passwordHash').lean();
      }

      if (!app) return sendResponse(res, 404, false, null, 'Application not found');
      return res.json({ success: true, data: shapeApp(app, app.studentId) });
    } catch (err) {
      console.error('[GET /application/view]', err);
      return sendResponse(res, 500, false, null, 'Server error');
    }
  }
);

/* ════════════════════════════════════════════════════════════════
   REVIEW ACTIONS (PHP-shaped endpoints)
   ════════════════════════════════════════════════════════════════ */

/**
 * POST /api/application/clerk-approve
 * Body: { application_id, remarks }
 */
router.post('/application/clerk-approve', verifyToken, roleGuard(['clerk']), async (req, res) => {
  try {
    const { application_id, remarks } = req.body;
    const query = application_id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: application_id, status: 'pending' }
      : { applicationId: application_id, status: 'pending' };

    const app = await Application.findOne(query);
    if (!app) return sendResponse(res, 404, false, null, 'Application not found or not in pending status');

    app.status = 'clerk_approved';
    app.clerkReview = { comment: remarks || '', reviewedBy: req.user.id, date: new Date() };
    await app.save();

    await AuditLog.create({
      actorId: req.user.id, actorRole: req.user.role,
      action: 'Clerk Approved', applicationId: app._id,
      meta: { remarks, statusChangedTo: 'clerk_approved' },
    });

    return res.json({ success: true, status: 'success', message: 'Application approved and forwarded to HOD' });
  } catch (err) {
    console.error('[POST /application/clerk-approve]', err);
    return sendResponse(res, 500, false, null, 'Server error');
  }
});

/**
 * POST /api/application/clerk-reject
 * Body: { application_id, remarks }
 */
router.post('/application/clerk-reject', verifyToken, roleGuard(['clerk']), async (req, res) => {
  try {
    const { application_id, remarks } = req.body;
    const query = application_id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: application_id, status: 'pending' }
      : { applicationId: application_id, status: 'pending' };

    const app = await Application.findOne(query);
    if (!app) return sendResponse(res, 404, false, null, 'Application not found or not in pending status');

    app.status = 'rejected_clerk';
    app.clerkReview = { comment: remarks || '', reviewedBy: req.user.id, date: new Date() };
    await app.save();

    await AuditLog.create({
      actorId: req.user.id, actorRole: req.user.role,
      action: 'Clerk Rejected', applicationId: app._id,
      meta: { remarks, statusChangedTo: 'rejected_clerk' },
    });

    return res.json({ success: true, status: 'success', message: 'Application rejected' });
  } catch (err) {
    console.error('[POST /application/clerk-reject]', err);
    return sendResponse(res, 500, false, null, 'Server error');
  }
});

/**
 * POST /api/application/hod-approve
 * Body: { application_id, remarks }
 */
router.post('/application/hod-approve', verifyToken, roleGuard(['hod']), async (req, res) => {
  try {
    const { application_id, remarks } = req.body;
    const query = application_id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: application_id, status: 'clerk_approved' }
      : { applicationId: application_id, status: 'clerk_approved' };

    const app = await Application.findOne(query);
    if (!app) return sendResponse(res, 404, false, null, 'Application not found or not in clerk_approved status');

    app.status = 'hod_approved';
    app.hodReview = { comment: remarks || '', reviewedBy: req.user.id, date: new Date() };
    await app.save();

    await AuditLog.create({
      actorId: req.user.id, actorRole: req.user.role,
      action: 'HOD Approved', applicationId: app._id,
      meta: { remarks, statusChangedTo: 'hod_approved' },
    });

    return res.json({ success: true, status: 'success', message: 'Application forwarded to Principal' });
  } catch (err) {
    console.error('[POST /application/hod-approve]', err);
    return sendResponse(res, 500, false, null, 'Server error');
  }
});

/**
 * POST /api/application/hod-reject
 * Body: { application_id, remarks }
 */
router.post('/application/hod-reject', verifyToken, roleGuard(['hod']), async (req, res) => {
  try {
    const { application_id, remarks } = req.body;
    const query = application_id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: application_id, status: 'clerk_approved' }
      : { applicationId: application_id, status: 'clerk_approved' };

    const app = await Application.findOne(query);
    if (!app) return sendResponse(res, 404, false, null, 'Application not found or not in clerk_approved status');

    app.status = 'rejected_hod';
    app.hodReview = { comment: remarks || '', reviewedBy: req.user.id, date: new Date() };
    await app.save();

    await AuditLog.create({
      actorId: req.user.id, actorRole: req.user.role,
      action: 'HOD Rejected', applicationId: app._id,
      meta: { remarks, statusChangedTo: 'rejected_hod' },
    });

    return res.json({ success: true, status: 'success', message: 'Application rejected by HOD' });
  } catch (err) {
    console.error('[POST /application/hod-reject]', err);
    return sendResponse(res, 500, false, null, 'Server error');
  }
});

/**
 * POST /api/application/principal-approve
 * Body: { application_id, remarks }
 */
router.post('/application/principal-approve', verifyToken, roleGuard(['principal']), async (req, res) => {
  try {
    const { application_id, remarks } = req.body;
    const query = application_id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: application_id, status: 'hod_approved' }
      : { applicationId: application_id, status: 'hod_approved' };

    const app = await Application.findOne(query);
    if (!app) return sendResponse(res, 404, false, null, 'Application not found or not in hod_approved status');

    app.status = 'approved';
    app.principalReview = { comment: remarks || '', reviewedBy: req.user.id, date: new Date() };
    await app.save();

    await AuditLog.create({
      actorId: req.user.id, actorRole: req.user.role,
      action: 'Principal Approved', applicationId: app._id,
      meta: { remarks, statusChangedTo: 'approved' },
    });

    return res.json({ success: true, status: 'success', message: 'Application approved. Certificate issued.' });
  } catch (err) {
    console.error('[POST /application/principal-approve]', err);
    return sendResponse(res, 500, false, null, 'Server error');
  }
});

/**
 * POST /api/application/principal-reject
 * Body: { application_id, remarks }
 */
router.post('/application/principal-reject', verifyToken, roleGuard(['principal']), async (req, res) => {
  try {
    const { application_id, remarks } = req.body;
    const query = application_id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: application_id, status: 'hod_approved' }
      : { applicationId: application_id, status: 'hod_approved' };

    const app = await Application.findOne(query);
    if (!app) return sendResponse(res, 404, false, null, 'Application not found or not in hod_approved status');

    app.status = 'rejected_principal';
    app.principalReview = { comment: remarks || '', reviewedBy: req.user.id, date: new Date() };
    await app.save();

    await AuditLog.create({
      actorId: req.user.id, actorRole: req.user.role,
      action: 'Principal Rejected', applicationId: app._id,
      meta: { remarks, statusChangedTo: 'rejected_principal' },
    });

    return res.json({ success: true, status: 'success', message: 'Application rejected by Principal' });
  } catch (err) {
    console.error('[POST /application/principal-reject]', err);
    return sendResponse(res, 500, false, null, 'Server error');
  }
});

/* ════════════════════════════════════════════════════════════════
   DOCUMENT DOWNLOAD (by application_number)
   ════════════════════════════════════════════════════════════════ */

/**
 * GET /api/documents/download?application_number=APP-xxx
 * Looks up the application, finds the first uploaded proof, and streams it.
 */
router.get('/documents/download', verifyToken, async (req, res) => {
  try {
    const { application_number } = req.query;
    if (!application_number) return sendResponse(res, 400, false, null, 'application_number is required');

    const app = await Application.findOne({ applicationId: application_number });
    if (!app) return sendResponse(res, 404, false, null, 'Application not found');

    if (app.status !== 'approved') {
      return sendResponse(res, 403, false, null, 'Document not yet approved for download');
    }

    if (!app.uploadedProofs || app.uploadedProofs.length === 0) {
      return sendResponse(res, 404, false, null, 'No documents found for this application');
    }

    // Stream the first uploaded proof file
    const filePath = path.resolve(app.uploadedProofs[0].fileUrl);
    if (!fs.existsSync(filePath)) {
      return sendResponse(res, 404, false, null, 'File not found on server');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${application_number}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[GET /documents/download]', err);
    return sendResponse(res, 500, false, null, 'Server error');
  }
});

module.exports = router;
