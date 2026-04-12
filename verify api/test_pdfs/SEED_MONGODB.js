// Run this in mongosh after: use digisecure
db.documents.deleteMany({ applicationId: { $in: ["JDCOEM/2024/BON/001","JDCOEM/2024/LC/002","JDCOEM/2024/NOC/003"] } });
db.documents.insertMany([
  {
    applicationId: "JDCOEM/2024/BON/001",
    fileHash: "f61e863d766f904a03ee13f5f6a993a392b9587f4e978899d64480546a9302c1",
    qrPayload: "http://localhost:5000/api/verify/JDCOEM%2F2024%2FBON%2F001",
    pdfPath: "/certificates/JDCOEM_2024_BON_001.pdf",
    issuedAt: new Date()
  },
  {
    applicationId: "JDCOEM/2024/LC/002",
    fileHash: "1dd623981cdf7470525e13ed22e6ff1962c96dd340bff310d8900601d04a7812",
    qrPayload: "http://localhost:5000/api/verify/JDCOEM%2F2024%2FLC%2F002",
    pdfPath: "/certificates/JDCOEM_2024_LC_002.pdf",
    issuedAt: new Date()
  },
  {
    applicationId: "JDCOEM/2024/NOC/003",
    fileHash: "fe82c981ad23f21654eb8da8e81b5094becc93810eba6fff3dac2685c10a6141",
    qrPayload: "http://localhost:5000/api/verify/JDCOEM%2F2024%2FNOC%2F003",
    pdfPath: "/certificates/JDCOEM_2024_NOC_003.pdf",
    issuedAt: new Date()
  }
]);
print("✓ Seeded 3 documents");
