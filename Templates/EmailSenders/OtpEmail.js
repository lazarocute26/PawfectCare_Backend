// Templates/EmailSenders/OtpEmail.js
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

exports.otpEmail = async (req, res) => {
  try {
    const { to, userName, otp, expiresInSeconds } = req.body;

    const templatePath = path.join(
      __dirname,
      "../ComposedEmails/OtpEmail.html"
    );
    let htmlContent = fs.readFileSync(templatePath, "utf-8");

    htmlContent = htmlContent
      .replace(/{{userName}}/g, userName)
      .replace(/{{otp}}/g, otp)
      .replace(/{{expiresIn}}/g, expiresInSeconds.toString());

    // use same transporter config as adoptionEmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"PawfectCare" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your PawfectCare Verification Code",
      html: htmlContent,
    });

    console.log("OTP Message sent:", info.messageId, info.envelope);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("OTP email error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
