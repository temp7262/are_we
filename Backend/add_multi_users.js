const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function addMoreUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const branches = [
            { name: 'Rahul Mech', email: 'rahul.mech@jdcoem.ac.in', branch: 'Mechanical Engineering', btid: 'BT21ME012' },
            { name: 'Priya Elect', email: 'priya.elect@jdcoem.ac.in', branch: 'Electrical Engineering', btid: 'BT21EE005' },
            { name: 'Amit Civil', email: 'amit.civil@jdcoem.ac.in', branch: 'Civil Engineering', btid: 'BT21CE088' },
            { name: 'Snehal ETC', email: 'snehal.etc@jdcoem.ac.in', branch: 'ETC Engineering', btid: 'BT21ET015' }
        ];

        const password = await bcrypt.hash('123456', 10);

        for (const b of branches) {
            const exists = await User.findOne({ email: b.email });
            if (!exists) {
                await User.create({
                    name: b.name,
                    email: b.email,
                    passwordHash: password,
                    role: 'student',
                    branch: b.branch,
                    btid: b.btid,
                    year: '3rd Year',
                    semester: '5',
                    mobile: '9123456780',
                    address: 'JDCOEM Campus, Nagpur'
                });
                console.log(`Created student: ${b.name}`);
            }
        }

        // Final Admin Verification
        const adminEmail = 'admin@jdcoem.ac.in';
        const adminExists = await User.findOne({ email: adminEmail });
        if (!adminExists) {
            await User.create({
                name: 'System Administrator',
                email: adminEmail,
                passwordHash: password,
                role: 'admin'
            });
            console.log('Created Admin account');
        } else {
            console.log('Admin account already exists');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

addMoreUsers();
