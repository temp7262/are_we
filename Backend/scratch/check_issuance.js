const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DocumentSchema = new mongoose.Schema({
    applicationId: String,
    pdfPath: String,
    issuedAt: Date
});

const ApplicationSchema = new mongoose.Schema({
    applicationId: String,
    status: String
});

const Document = mongoose.model('Document', DocumentSchema);
const Application = mongoose.model('Application', ApplicationSchema);

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB...");

    const apps = await Application.find({ status: 'principal_approved' });
    console.log(`\nFound ${apps.length} Principal Approved Applications:`);
    apps.forEach(a => console.log(` - ${a.applicationId}`));

    const docs = await Document.find({});
    console.log(`\nFound ${docs.length} Generated Certificates:`);
    docs.forEach(d => console.log(` - ID: ${d.applicationId} | Path: ${d.pdfPath}`));

    await mongoose.disconnect();
}

check();
