require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');
const { sendResponse } = require('./utils/response');

const app = express();

// Serverless DB Connection Middleware
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    return sendResponse(res, 500, false, null, 'Database connection failed. Please check MongoDB Atlas IP whitelisting.');
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*'
}));
app.use(express.json());

// Serve Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/certificates', express.static(path.join(__dirname, 'certificates')));

// ❌ Removed: Frontend static serving (Vercel handles frontend separately)
// app.use('/Frontend', express.static(...));
// app.use(express.static(path.join(__dirname, 'public')));

// Main Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/review', require('./routes/review'));
app.use('/api/documents', require('./routes/documents').router);
app.use('/api/verify', require('./routes/verify'));
app.use('/api/admin', require('./routes/admin'));


app.get('/api/debug', (req, res) => {
  res.json({
    mongo_uri_exists: !!process.env.MONGO_URI,
    node_env: process.env.NODE_ENV,
  });
});
// Basic Route for testing
app.get('/', (req, res) => {
  sendResponse(res, 200, true, null, 'DigiSecure API is running');
});

// ✅ Only listen locally, not on Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app; // ✅ Critical for Vercel