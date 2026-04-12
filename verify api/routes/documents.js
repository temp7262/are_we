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
const generateQRDataURL = async (payload) => await QRCode.toDataURL(JSON.stringify(payload));

const generateCertificate = async (applicationId) => {
  const application = await Application.findOne({ applicationId });
  if (!application) throw new Error("Application not found");

  const existing = await Document.findOne({ applicationId });
  if (existing) return existing;

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

  const verifyUrl = `http://localhost:5000/api/verify/${encodeURIComponent(applicationId)}`;
  const qrDataURL = await QRCode.toDataURL(verifyUrl);
  const pdfBuffer = await buildPDF(application, qrDataURL, { hodSign, principalSign });
  const fileHash = hashBuffer(pdfBuffer);

  const filename = `${applicationId.replace(/\//g, '_')}_${Date.now()}.pdf`;
  const pdfPath = path.join(CERTS_DIR, filename);
  fs.writeFileSync(pdfPath, pdfBuffer);

  const docRecord = new Document({
    applicationId,
    fileHash,
    qrPayload: verifyUrl,
    pdfPath: `/certificates/${filename}`,
    issuedAt: new Date()
  });
  await docRecord.save();
  return docRecord;
};

const buildPDF = (application, qrDataURL, signs = {}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 50,
      info: {
        Title: application.applicationType || "Certificate",
        Author: "JDCOEM DigiSecure",
        Subject: application.applicationId,
        Keywords: application.applicationId,
        Creator: "JDCOEM DigiSecure v1.0"
      }
    });
    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Header Branding
    const leftLogo = path.join(__dirname, "../logo_left.png");
    const rightLogo = path.join(__dirname, "../logo_right.png");

    if (fs.existsSync(leftLogo)) doc.image(leftLogo, 50, 45, { width: 60 });
    if (fs.existsSync(rightLogo)) doc.image(rightLogo, 485, 45, { width: 60 });

    doc.fontSize(16).font("Helvetica-Bold").text("JAIDEV EDUCATION SOCIETY'S", { align: "center" });
    doc.fontSize(14).text("J D COLLEGE OF ENGINEERING & MANAGEMENT", { align: "center" });
    doc.fontSize(8).font("Helvetica").text("An Autonomous Institute, Affiliated to DBATU & RTMNU", { align: "center" });
    doc.fontSize(8).text("Khandala, Katol Road, Nagpur-441501", { align: "center" });

    doc.moveDown(1.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1);

    const title = application.applicationType || "Certificate";
    doc.fontSize(18).font("Helvetica-Bold").text(title.toUpperCase(), { align: "center", underline: true });
    doc.moveDown(2);

    // Content
    doc.font("Helvetica").fontSize(12).lineGap(8);
    const studentName = application.extraData?.name || "Student";
    const rollNo = application.extraData?.rollNo || "N/A";
    const branch = application.extraData?.branch || "Engineering";
    const year = application.extraData?.academic_year || "2023-24";

    let body = "";
    if (title.toLowerCase().includes("bonafide")) {
      body = `This is to certify that Mr./Ms. ${studentName}, bearing Roll No. ${rollNo}, is a bonafide student of this institute, studying in ${branch} during the academic year ${year}. To the best of my knowledge, he/she bears a good moral character.`;
    } else {
      body = `This document serves as an official confirmation for ${studentName} regarding the application for ${title}. This record is verified and issued by the competent authority of JDCOEM.`;
    }

    doc.text(body, { align: "justify" });
    doc.moveDown(3);

    // Verification Info & QR
    const startY = doc.y;
    doc.fontSize(10).font("Helvetica-Bold").text("Verification Details:");
    doc.font("Helvetica").fontSize(9);
    doc.text(`Application ID: ${application.applicationId}`);
    doc.text(`Tracking ID: ${application.trackingId}`);
    doc.text(`Issued Date: ${new Date().toLocaleDateString()}`);

    const qrBase64 = qrDataURL.replace(/^data:image\/png;base64,/, "");
    const qrBuffer = Buffer.from(qrBase64, "base64");
    doc.image(qrBuffer, 460, startY - 10, { width: 80 });

    doc.moveDown(4);

    // Signatures
    const signY = doc.y;
    doc.fontSize(10).font("Helvetica-Bold");

    if (signs.hodSign && fs.existsSync(signs.hodSign)) {
      doc.image(signs.hodSign, 220, signY - 45, { width: 100 });
    }
    if (signs.principalSign && fs.existsSync(signs.principalSign)) {
      doc.image(signs.principalSign, 430, signY - 45, { width: 100 });
    }

    doc.text("Clerk Signature", 50, signY);
    doc.text("HOD Signature", 250, signY);
    doc.text("Principal Signature", 450, signY);

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
  const p = path.join(__dirname, "..", doc.pdfPath);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${doc.applicationId.replace(/\//g, '_')}.pdf"`);
  fs.createReadStream(p).pipe(res);
};

module.exports = { router, generateCertificate };