const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const User = require('../models/User');

async function updateUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('123456', salt);

    // 1. Add/Update Student: saarkharbikar@jdcoem.ac.in
    await User.findOneAndUpdate(
      { email: 'saarkharbikar@jdcoem.ac.in' },
      { 
        name: 'Sagar K Student', 
        email: 'saarkharbikar@jdcoem.ac.in', 
        passwordHash, 
        role: 'student' 
      },
      { upsert: true, new: true }
    );
    console.log('Student saarkharbikar@jdcoem.ac.in added/updated with pass 123456');

    // 2. Update Clerk, HOD, Principal passwords
    const result = await User.updateMany(
      { role: { $in: ['clerk', 'hod', 'principal'] } },
      { $set: { passwordHash } }
    );
    console.log(`Updated ${result.modifiedCount} admin/staff users to password '123456'`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

updateUsers();
