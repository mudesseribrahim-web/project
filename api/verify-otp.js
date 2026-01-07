const serverless = require("serverless-http");
const app = require("./_app");

app.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.json({ success: false, error: "Email aur OTP daalo" });

  const ref = app.db.collection("otps").doc(email.toLowerCase());
  const doc = await ref.get();

  if (!doc.exists) return res.json({ success: false, error: "OTP nahi mila" });

  const data = doc.data();
  if (new Date() > data.expiresAt.toDate()) {
    await ref.delete();
    return res.json({ success: false, error: "OTP expire ho gaya" });
  }

  if (data.otp !== otp) return res.json({ success: false, error: "OTP galat hai" });

  await ref.delete();
  res.json({ success: true, message: "OTP verify ho gaya" });
});

module.exports = app;
module.exports.handler = serverless(app);
