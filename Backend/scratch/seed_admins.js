const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env' });
const User = require('../models/User');

const seedAdmins = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const admins = [
            { name: 'Admin Clerk', email: 'saar@jdcoem.ac.in', role: 'clerk' },
            { name: 'HOD Computer Science', email: 'skhod@jdcoem.ac.in', role: 'hod' },
            { name: 'Principal Office', email: 'sagar@jdcoem.ac.in', role: 'principal' }
        ];

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash('123456', salt);

        for (const admin of admins) {
            // Delete if exists first to avoid duplicate errors while updating
            await User.deleteOne({ email: admin.email });
            
            const newUser = new User({
                ...admin,
                passwordHash: hash
            });
            await newUser.save();
            console.log(`Successfully registered: ${admin.email} (Password: 123456)`);
        }

        console.log('\n--- ALL ADMIN ACCOUNTS ARE NOW ACTIVE ---');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding admins:', err);
        process.exit(1);
    }
};

seedAdmins();
