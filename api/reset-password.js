const serverless = require("serverless-http");
const app = require("./_app");
const bcrypt = require("bcryptjs");

app.post("/reset-password", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.json({ success: false, error: "Email aur password daalo" });

  const snapshot = await app.db
    .collection("users")
    .where("email", "==", email.toLowerCase())
    .get();

  if (snapshot.empty) return res.json({ success: false, error: "User nahi mila" });

  const hashedPassword = bcrypt.hashSync(password, 10);
  await snapshot.docs[0].ref.update({ password: hashedPassword });

  res.json({ success: true, message: "Password reset successful" });
});

module.exports = app;
module.exports.handler = serverless(app);
