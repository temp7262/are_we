const mongoose = require('mongoose');
const Application = require('../models/Application');
require('dotenv').config({ path: './.env' });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected.');
  const apps = await Application.find().sort({ createdAt: -1 }).limit(5);
  console.log('--- RECENT APPLICATIONS ---');
  apps.forEach(a => {
    console.log(`ID: ${a.applicationId} | Status: ${a.status} | Tracking: ${a.trackingId}`);
  });
  process.exit(0);
}
check();
