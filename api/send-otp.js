const serverless = require("serverless-http");
const app = require("./_app");

app.post("/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, error: "Email daalo!" });

  const snapshot = await app.db
    .collection("users")
    .where("email", "==", email.toLowerCase())
    .get();

  if (snapshot.empty) return res.json({ success: false, error: "User nahi mila" });

  const otp = app.generateOtp();

  await app.db.collection("otps").doc(email.toLowerCase()).set({
    otp,
    expiresAt: app.admin.firestore.Timestamp.fromDate(new Date(Date.now() + 5 * 60 * 1000)),
  });

  await app.transporter.sendMail({
    from: `"OTP" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "OTP Code",
    html: `<b>${otp}</b>`,
  });

  res.json({ success: true, message: "OTP bhej diya" });
});

module.exports = app;
module.exports.handler = serverless(app);
