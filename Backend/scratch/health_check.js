const mongoose = require('mongoose');
require('dotenv').config();
const Application = require('../models/Application');
const User = require('../models/User');

async function check() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    const appCount = await Application.countDocuments();
    const userCount = await User.countDocuments();
    console.log(`Applications: ${appCount}, Users: ${userCount}`);

    const apps = await Application.find().populate('studentId').limit(5);
    console.log('Sample Apps fetched successfully.');
    
    apps.forEach(a => {
      console.log(`- App: ${a.applicationId}, Student: ${a.studentId ? a.studentId.name : 'NULL'}`);
    });

    console.log('Health Check passed.');
    process.exit(0);
  } catch (err) {
    console.error('Health Check FAILED:', err);
    process.exit(1);
  }
}

check();
