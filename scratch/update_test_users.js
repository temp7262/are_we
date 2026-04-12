const mongoose = require('mongoose');
const User = require('./Backend/models/User');
require('dotenv').config({ path: './Backend/.env' });

async function updateSagar() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const sagar = await User.findOne({ email: 'saarkharbikar@jdcoem.ac.in' });
        if (sagar) {
            sagar.branch = 'Computer Engineering';
            sagar.year = '4th Year';
            sagar.semester = '7';
            sagar.btid = 'BT21CS042';
            sagar.mobile = '9011010038';
            sagar.address = 'Khandala, Post: Valni, Near Hanuman Temple, Nagpur';
            sagar.gender = 'male';
            sagar.dob = '2003-05-15';
            sagar.prn = '202101660123456';
            
            await sagar.save();
            console.log('Sagar profile updated successfully!');
        } else {
            console.log('Sagar user not found.');
        }

        // Also ensure admin has a role
        const admin = await User.findOne({ email: 'admin@jdcoem.ac.in' });
        if (admin) {
            admin.role = 'admin';
            await admin.save();
            console.log('Admin role confirmed.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateSagar();
