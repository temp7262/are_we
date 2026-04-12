require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const connectDB = require('./config/db');

const seedDatabase = async () => {
  try {
    // 1. Connect to MongoDB Atlas
    await connectDB();
    
    // 2. Clear old test data off the DB
    await User.deleteMany();

    console.log('Generating Tables and Seeding Users...');

    // 3. Create a default password for all test accounts
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('123456', salt);

    // 4. Create one user for every single role in your Hackathon Plan
    const mockUsers = [
      { name: 'Test Student', email: 'student@test.com', passwordHash: defaultPassword, role: 'student' },
      { name: 'Test Clerk', email: 'clerk@test.com', passwordHash: defaultPassword, role: 'clerk' },
      { name: 'Test HOD', email: 'hod@test.com', passwordHash: defaultPassword, role: 'hod' },
      { name: 'Test Principal', email: 'principal@test.com', passwordHash: defaultPassword, role: 'principal' },
      { name: 'Test Admin', email: 'admin@test.com', passwordHash: defaultPassword, role: 'admin' },
    ];

    // 5. Insert directly into MongoDB
    await User.insertMany(mockUsers);

    console.log('');
    console.log('✅ DATABASE TABLES ("Collections") CREATED SUCCESSFULLY!');
    console.log('All test accounts created with password: "123456"');
    console.log('Emails generated: student@test.com, clerk@test.com, hod@test.com, principal@test.com, admin@test.com');
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed:', error);
    process.exit(1);
  }
};

seedDatabase();
