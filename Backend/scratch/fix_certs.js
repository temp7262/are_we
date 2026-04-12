const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { generateCertificate } = require('../routes/documents');

async function fix() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB...");

    const targets = ['APP-1775901718561', 'JDCOEM/2026/0001'];
    
    for(const id of targets) {
        try {
            console.log(`Generating Certificate for ${id}...`);
            await generateCertificate(id);
            console.log(`✅ Success for ${id}`);
        } catch(e) {
            console.error(`❌ Failed for ${id}: ${e.message}`);
        }
    }

    await mongoose.disconnect();
}

fix();
