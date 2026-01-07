const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// ---------------- Firebase ----------------
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (err) {
  console.error("Firebase credentials missing");
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// ---------------- Nodemailer ----------------
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// ---------------- Helpers ----------------
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// ---------------- Routes ----------------
app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, error: "Email required" });

  try {
    const snapshot = await db
      .collection("users")
      .where("email", "==", email.toLowerCase())
      .get();

    if (snapshot.empty)
      return res.json({ success: false, error: "User not found" });

    const otp = generateOtp();

    await db.collection("otps").doc(email.toLowerCase()).set({
      otp,
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 5 * 60 * 1000)
      ),
    });

    await transporter.sendMail({
      from: `"OTP Service" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      html: `<b>Your OTP is ${otp}</b>`,
    });

    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: "OTP failed" });
  }
});

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  const doc = await db.collection("otps").doc(email.toLowerCase()).get();
  if (!doc.exists) return res.json({ success: false });

  const data = doc.data();
  if (data.otp !== otp) return res.json({ success: false });

  await doc.ref.delete();
  res.json({ success: true });
});

app.post("/reset-password", async (req, res) => {
  const { email, password } = req.body;

  const snap = await db
    .collection("users")
    .where("email", "==", email.toLowerCase())
    .get();

  if (snap.empty) return res.json({ success: false });

  const hash = bcrypt.hashSync(password, 10);
  await snap.docs[0].ref.update({ password: hash });

  res.json({ success: true });
});

// ❌ app.listen nahi hoga
module.exports = app;
