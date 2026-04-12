require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const connectDB = require('./config/db');
const { sendResponse } = require('./utils/response');

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve Static Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/certificates', express.static(path.join(__dirname, 'certificates')));
app.use('/Frontend', express.static(path.join(__dirname, '..', 'Frontend')));
app.use(express.static(path.join(__dirname, 'public')));

// Main Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/review', require('./routes/review'));
app.use('/api/documents', require('./routes/documents').router);
app.use('/api/verify', require('./routes/verify'));
app.use('/api/admin', require('./routes/admin'));

// Basic Route for testing
app.get('/', (req, res) => {
  sendResponse(res, 200, true, null, 'DigiSecure API is running');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
