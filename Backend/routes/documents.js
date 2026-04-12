// routes/documents.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

const Document = require("../models/Document");
const Application = require("../models/Application");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");
const roleGuard = require("../middleware/role");
const { success, error } = require("../utils/response");

const CERTS_DIR = path.join(__dirname, "../certificates");
if (!fs.existsSync(CERTS_DIR)) fs.mkdirSync(CERTS_DIR, { recursive: true });

const hashBuffer = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

// Helper to get local IP for mobile accessibility
// Helper to get local IP for mobile accessibility
const getLocalIP = () => {
    const os = require('os');
    const nets = os.networkInterfaces();
    let preferred = null;

    for (const name of Object.keys(nets)) {
        // Skip virtual/WSL adapters that often start with 'v' or 'w'
        if (name.toLowerCase().includes('virtual') || name.toLowerCase().includes('wsl') || name.toLowerCase().includes('ethernet 2')) continue;
        
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                // Prioritize common local home/office ranges
                if (net.address.startsWith('192.168.') || net.address.startsWith('10.')) {
                    return net.address;
                }
                preferred = net.address;
            }
        }
    }
    return preferred || 'localhost';
};

const generateQRDataURL = async (payload) => await QRCode.toDataURL(JSON.stringify(payload));

const generateCertificate = async (applicationId) => {
  const application = await Application.findOne({ applicationId });
  if (!application) throw new Error("Application not found");

  const existing = await Document.findOne({ applicationId });
  if (existing) {
    // Check the file actually exists on disk
    const filePath = path.join(__dirname, '..', existing.pdfPath || '');
    if (existing.pdfPath && fs.existsSync(filePath)) {
      return existing; // File is valid, return it
    }
    // File is missing or path is undefined — delete stale record and regenerate
    await Document.deleteOne({ _id: existing._id });
  }

  // Fetch Signatures
  let hodSign = null;
  let principalSign = null;

  if (application.hodReview?.reviewedBy) {
    const hod = await User.findById(application.hodReview.reviewedBy);
    if (hod?.signatureUrl) hodSign = path.join(__dirname, "..", hod.signatureUrl);
  }
  if (application.principalReview?.reviewedBy) {
    const principal = await User.findById(application.principalReview.reviewedBy);
    if (principal?.signatureUrl) principalSign = path.join(__dirname, "..", principal.signatureUrl);
  }

  // Point to the backend verification endpoint
  // Use NGROK / Public URL if available, otherwise fallback to local IP
  const serverIP = getLocalIP();
  const domain = process.env.PUBLIC_URL || `http://${serverIP}:5000`;
  const verifyUrl = `${domain}/api/verify/${encodeURIComponent(applicationId)}`;
  console.log(`[CERT-GEN] QR URL generated: ${verifyUrl}`);
  const qrDataURL = await QRCode.toDataURL(verifyUrl);
  
  const pdfBuffer = await buildPDF(application, qrDataURL, { hodSign, principalSign });
  const fileHash = hashBuffer(pdfBuffer);

  const filename = `${applicationId.replace(/\//g, '_')}_${Date.now()}.pdf`;
  const pdfPath = path.join(CERTS_DIR, filename);
  fs.writeFileSync(pdfPath, pdfBuffer);

  const docRecord = new Document({
    applicationId,
    fileHash,
    pdfPath: `/certificates/${filename}`,
    issuedAt: new Date()
  });
  await docRecord.save();
  return docRecord;
};

const buildPDF = (application, qrDataURL, signs = {}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // 1. NO Borders (Removed old rect calls)
    doc.fillColor('#000000'); // reset

    // 2. Clear Header Branding (Logos on edges, Text centered)
    const leftLogo = path.join(__dirname, "../logo_left.png");
    const rightLogo = path.join(__dirname, "../logo_right.png");

    if (fs.existsSync(leftLogo)) doc.image(leftLogo, 45, 40, { width: 70 });
    if (fs.existsSync(rightLogo)) doc.image(rightLogo, doc.page.width - 115, 40, { width: 70 });

    // MOVE TEXT DOWN significantly to clear the logos (y=120)
    doc.y = 120;
    doc.fontSize(11).font("Helvetica-Bold").fillColor('#4b5563').text("JAIDEV EDUCATION SOCIETY'S", { align: "center" });
    doc.fontSize(22).font("Helvetica-Bold").fillColor('#1a365d').text("J D COLLEGE OF ENGINEERING & MANAGEMENT", { align: "center" });
    doc.fontSize(10).font("Helvetica-Bold").fillColor('#854d0e').text("An Autonomous Institute, Affiliated to DBATU & RTMNU", { align: "center" });
    doc.fontSize(10).font("Helvetica").fillColor('#4b5563').text("Khandala, Katol Road, Nagpur-441501", { align: "center" });

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).lineWidth(1).strokeColor('#e5e7eb').stroke();
    doc.moveDown(3);

    // 3. Title
    const title = application.applicationType || "Certificate";
    doc.fontSize(28).font("Helvetica-Bold").fillColor('#111827').text(title.toUpperCase(), { align: "center" });
    
    // Underline for title
    const titleY = doc.y + 3;
    const textWidth = doc.widthOfString(title.toUpperCase());
    doc.moveTo((doc.page.width - textWidth) / 2, titleY).lineTo((doc.page.width + textWidth) / 2, titleY).strokeColor('#854d0e').lineWidth(2).stroke();
    doc.moveDown(5);

    // 4. Body Content
    doc.font("Helvetica").fontSize(14.5).fillColor('#1f2937').lineGap(12);
    const studentName = application.extraData?.name || "Student";
    const btid = application.extraData?.btid || application.extraData?.rollNo || "N/A";
    const branch = application.extraData?.branch || "Engineering";
    const year = application.extraData?.academic_year || application.extraData?.current_year || "2025";

    let body = "";
    if (title.toLowerCase().includes("bonafide")) {
      body = `This is to certify that Mr./Ms. ${studentName}, bearing ID / Roll No. ${btid}, is a bonafide student of this institute, studying in ${branch} during the academic year ${year}. To the best of our knowledge, he/she bears a good moral character.`;
    } else if (title.toLowerCase().includes("character")) {
      body = `This is to certify that Mr./Ms. ${studentName}, bearing ID / Roll No. ${btid}, was a student of this institute in the department of ${branch}. During his/her tenure, he/she has shown excellent conduct and bears a good moral character.`;
    } else if (title.toLowerCase().includes("fee receipt") || title.toLowerCase().includes("fee")) {
      body = `This serves as an official fee receipt confirmation for Mr./Ms. ${studentName}, ID / Roll No. ${btid}, enrolled in ${branch}. The fee payment for the academic session ${year} has been verified by the accounts department.`;
    } else {
      body = `This document serves as an official confirmation for ${studentName} (ID: ${btid}, Branch: ${branch}) regarding the approved request for ${title}. This record has been successfully verified and issued by the competent authorities of JDCOEM.`;
    }

    doc.text(body, { align: "justify", indent: 0 });
    
    // 5. Verification Details & QR (Fixed position from bottom to prevent overlap)
    const footerStartY = doc.page.height - 240; 
    doc.y = footerStartY;
    
    doc.fontSize(11).font("Helvetica-Bold").fillColor('#111827').text("Verification Details:");
    doc.moveDown(0.5);
    doc.font("Helvetica").fontSize(10).fillColor('#4b5563').lineGap(4);
    doc.text(`Application No: ${application.applicationId}`);
    doc.text(`Tracking ID: ${application.trackingId || application._id}`);
    doc.text(`Issued Date: ${new Date().toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'})}`);

    const qrBase64 = qrDataURL.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(qrBase64, "base64");
    // Position QR to the right of verification details
    doc.image(qrBuffer, doc.page.width - 150, footerStartY - 5, { width: 90 });

    // 6. Signature Section (Fixed at very bottom)
    const signY = doc.page.height - 100;
    const signWidth = 180;
    
    // HOD Signature (Left side)
    const leftSignX = 60;
    if (signs.hodSign && fs.existsSync(signs.hodSign)) {
      doc.image(signs.hodSign, leftSignX + 40, signY - 45, { width: 100 });
    } else {
      doc.font("Helvetica-Oblique").fontSize(14).fillColor('#1e40af').text("HOD Signed", leftSignX, signY - 25, { width: signWidth, align: 'center' });
    }
    doc.moveTo(leftSignX, signY - 5).lineTo(leftSignX + signWidth, signY - 5).lineWidth(1).strokeColor('#9ca3af').stroke();
    doc.font("Helvetica-Bold").fontSize(11).fillColor('#111827').text("Head of Department", leftSignX, signY, { width: signWidth, align: "center" });

    // Principal Signature (Right side)
    const rightSignX = doc.page.width - signWidth - 60;
    if (signs.principalSign && fs.existsSync(signs.principalSign)) {
      doc.image(signs.principalSign, rightSignX + 40, signY - 45, { width: 100 });
    } else {
      doc.font("Helvetica-Oblique").fontSize(14).fillColor('#1e40af').text("Principal Signed", rightSignX, signY - 25, { width: signWidth, align: 'center' });
    }
    doc.moveTo(rightSignX, signY - 5).lineTo(rightSignX + signWidth, signY - 5).lineWidth(1).strokeColor('#9ca3af').stroke();
    doc.font("Helvetica-Bold").fontSize(11).fillColor('#111827').text("Principal", rightSignX, signY, { width: signWidth, align: "center" });

    doc.end();
  });
};

// Routes
router.post("/generate", authMiddleware, roleGuard(["clerk", "hod", "principal", "admin"]), async (req, res) => {
  try {
    const doc = await generateCertificate(req.body.applicationId);
    return success(res, doc, "Document generated");
  } catch (err) { return error(res, err.message, 500); }
});

router.get("/:id/download", authMiddleware, async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return error(res, "Not found", 404);
    streamFile(doc, res);
  } catch (err) { return error(res, "Error", 500); }
});

// Download by Application ID (Student-friendly)
router.get("/application/:appId/download", authMiddleware, async (req, res) => {
  try {
    const appId = decodeURIComponent(req.params.appId);
    const doc = await Document.findOne({ applicationId: appId });
    if (!doc) return error(res, "Certificate not ready", 404);
    streamFile(doc, res);
  } catch (err) { return error(res, "Error", 500); }
});

const streamFile = (doc, res) => {
  const p = path.join(__dirname, '..', doc.pdfPath);
  if (!doc.pdfPath || !fs.existsSync(p)) {
    return res.status(404).json({ success: false, message: 'PDF file not found on server. Please contact support.' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${doc.applicationId.replace(/\//g, '_')}.pdf"`);
  fs.createReadStream(p).pipe(res);
};

module.exports = { router, generateCertificate };