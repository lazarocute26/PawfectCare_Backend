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

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // STARTTLS
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER, // full Gmail address
        pass: process.env.EMAIL_APP_PASS, // 16‑char app password
      },
    });

    const info = await transporter.sendMail({
      from: `"Pawfect Care" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your PawfectCare Verification Code",
      html: htmlContent,
    });

    console.log("OTP Message sent via Gmail SMTP:", info.messageId);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("OTP email error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
