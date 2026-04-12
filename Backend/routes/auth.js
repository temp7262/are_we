const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const verifyToken = require('../middleware/auth');
const { sendResponse } = require('../utils/response');
const sendEmail = require('../utils/sendEmail');

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return sendResponse(res, 404, false, null, 'User not found');
    sendResponse(res, 200, true, user, 'User profile fetched');
  } catch (error) {
    sendResponse(res, 500, false, null, 'Server error');
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return sendResponse(res, 400, false, null, 'Email is required');
    
    // Strict Domain Security
    if (!email.trim().toLowerCase().endsWith('@jdcoem.ac.in')) {
      return sendResponse(res, 403, false, null, 'Security Violation: Only valid @jdcoem.ac.in accounts are permitted access.');
    }

    // Generate a secure 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Kill any existing OTPs for them to prevent spam duplicates
    await OTP.deleteOne({ email });

    // Store in DB with the 5-min TTL index
    const newOtp = new OTP({ email, otp: otpCode });
    await newOtp.save();

    const message = `Welcome to DigiSecure! Your One-Time Password (OTP) is: ${otpCode}\n\nIt is valid for 5 minutes. Do not share this with anyone.`;
    
    try {
      await sendEmail({
        email,
        subject: 'DigiSecure - Verification Code',
        message
      });
      sendResponse(res, 200, true, null, 'OTP physically sent to your Gmail inbox!');
    } catch (emailError) {
      // For fast Dev Testing if Gmail fails, fallback to printing in Terminal
      console.error("[GMAIL ERROR]", emailError.message);
      console.log(`\n===================\n[DEV] OTP GENERATED FOR ${email}: ${otpCode}\n===================\n`);
      sendResponse(res, 200, true, null, 'Gmail failed (.env error?) but OTP was logged to your terminal console for Dev Testing!');
    }
  } catch (error) {
    sendResponse(res, 500, false, null, 'Server error during OTP transmission');
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, otp } = req.body;
    
    if (!otp) return sendResponse(res, 400, false, null, 'An OTP is required for registration.');
    
    let user = await User.findOne({ email });
    if (user) return sendResponse(res, 400, false, null, 'User already exists');

    // Validate the OTP
    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord || otpRecord.otp !== otp) {
      return sendResponse(res, 400, false, null, 'Invalid or Expired OTP. Please resend.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    user = new User({ name, email, passwordHash, role });
    await user.save();
    // Security passing: consume OTP so it can't be reused
    await OTP.deleteOne({ email });

    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    sendResponse(res, 201, true, { token }, 'Registration successful & OTP verified');
  } catch (error) {
    sendResponse(res, 500, false, null, 'Server error');
  }
});

// POST /api/auth/login/student
router.post('/login/student', async (req, res) => {
  try {
    const { email, password, otp } = req.body;
    
    if (!otp) return sendResponse(res, 400, false, null, 'An OTP is strictly required to login as a Student.');
    
    const user = await User.findOne({ email });
    
    if (!user || user.role !== 'student') return sendResponse(res, 403, false, null, 'Invalid Student credentials');

    // Verify OTP explicitly before processing to limit Brute forcing
    const otpRecord = await OTP.findOne({ email });
    if (!otpRecord || otpRecord.otp !== otp) {
      return sendResponse(res, 400, false, null, 'Invalid or Expired OTP. Please resend.');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return sendResponse(res, 400, false, null, 'Invalid password');

    // Delete OTP on success
    await OTP.deleteOne({ email });

    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    sendResponse(res, 200, true, { token, role: user.role }, 'Student Login highly-secured and successful');
  } catch (error) {
    sendResponse(res, 500, false, null, 'Server error');
  }
});

// POST /api/auth/login/admin
router.post('/login/admin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    // Prevent students from logging into the Admin module
    if (!user || user.role === 'student') return sendResponse(res, 403, false, null, 'Invalid Admin/Staff credentials');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return sendResponse(res, 400, false, null, 'Invalid password');

    const payload = { id: user.id, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    sendResponse(res, 200, true, { token, role: user.role }, 'Admin/Staff Login successful');
  } catch (error) {
    sendResponse(res, 500, false, null, 'Server error');
  }
});

// POST /api/auth/profile/update (Student self-update - UNLOCKED FOR TESTING)
router.post('/profile/update', verifyToken, async (req, res) => {
  try {
    const { 
      name, dob, gender, email, mobile, address, 
      branch, programme, year, semester, section, btid, prn, admission_year,
      college_name, college_status, university, city
    } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) return sendResponse(res, 404, false, null, 'User not found');

    // Update all fields provided in request
    if (name) user.name = name;
    if (dob) user.dob = dob;
    if (gender) user.gender = gender;
    if (email) user.email = email;
    if (mobile) user.mobile = mobile;
    if (address !== undefined) user.address = address;
    if (branch) user.branch = branch;
    if (programme) user.programme = programme;
    if (year) user.year = year;
    if (semester) user.semester = semester;
    if (section !== undefined) user.section = section;
    if (btid) user.btid = btid;
    if (prn) user.prn = prn;
    if (admission_year) user.admission_year = admission_year;
    if (college_name) user.college_name = college_name;
    if (college_status) user.college_status = college_status;
    if (university) user.university = university;
    if (city) user.city = city;

    await user.save();
    
    // Return user without passwordHash
    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    sendResponse(res, 200, true, safeUser, 'Profile updated successfully');
  } catch (error) {
    sendResponse(res, 500, false, null, 'Error updating profile');
  }
});

// POST /api/auth/password/change
router.post('/password/change', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return sendResponse(res, 400, false, null, 'Both current and new password are required');
    if (newPassword.length < 8)
      return sendResponse(res, 400, false, null, 'New password must be at least 8 characters');

    const user = await User.findById(req.user.id);
    if (!user) return sendResponse(res, 404, false, null, 'User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return sendResponse(res, 401, false, null, 'Current password is incorrect');

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();
    sendResponse(res, 200, true, null, 'Password changed successfully');
  } catch (error) {
    sendResponse(res, 500, false, null, 'Error changing password');
  }
});

module.exports = router;
