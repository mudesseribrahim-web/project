const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const serverless = require("serverless-http");

const app = express();
app.use(cors());
app.use(express.json());

// Firebase
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// OTP Helper
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Route
app.post("/", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false });

  const snap = await db.collection("users").where("email", "==", email.toLowerCase()).get();
  if (snap.empty) return res.json({ success: false });

  const otp = generateOtp();
  await db.collection("otps").doc(email).set({
    otp,
    expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)),
  });

  await transporter.sendMail({
    from: `"OTP" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "OTP Code",
    html: `<b>${otp}</b>`,
  });

  res.json({ success: true });
});

// ⚡ Serverless export
module.exports = app;
module.exports.handler = serverless(app);
