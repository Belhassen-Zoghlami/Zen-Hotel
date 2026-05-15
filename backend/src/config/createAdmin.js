const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

const crAdmin = async () => {
  try {
    const existAd = await User.findOne({ role: "admin" });
    if (existAd) {
      // Patch existing admin if it was created before email_verified was required
      if (!existAd.email_verified) {
        existAd.email_verified = true;
        await existAd.save();
        console.log("Admin account patched: email_verified set to true");
      }
      return console.log("admin exists already");
    }

    const hashedpassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await User.create({
      name: "SupAdmin",
      email: process.env.ADMIN_EMAIL,
      password: hashedpassword,
      role: "admin",
      isValidated: true,
      email_verified: true, // Admin accounts are pre-verified
    });
    console.log("admin account has been created");
  } catch (err) {
    console.log("admin creation failed", err.message);
  }
};

module.exports = crAdmin;
