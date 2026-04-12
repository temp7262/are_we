const mongoose = require('mongoose');
require('dotenv').config({ path: '../.env' });
const User = require('../models/User');

async function audit() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');
    const users = await User.find({ role: { $ne: 'student' } }).select('email role');
    console.log('--- Registered Admin/Staff Users ---');
    if (users.length === 0) {
      console.log('NO ADMIN USERS FOUND. Please use First-Time Setup.');
    } else {
      users.forEach(u => console.log(`${u.email} [${u.role}]`));
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
audit();
