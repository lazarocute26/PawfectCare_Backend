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
      secure: false, // TLS via STARTTLS
      requireTLS: true,
      auth: {
        user: process.env.EMAIL_USER, // your full Gmail
        pass: process.env.EMAIL_APP_PASS, // 16-char app password
      },
    });

    console.log("Resend response:", { data, error }); // <--- add this

    if (error) {
      console.error("OTP email error:", error);
      return res
        .status(500)
        .json({ success: false, error: error.message || "Email error" });
    }

    console.log("OTP Message sent via Resend:", data?.id);
    return res.status(200).json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error("OTP email error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
