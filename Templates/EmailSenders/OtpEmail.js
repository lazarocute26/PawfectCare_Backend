// Templates/EmailSenders/OtpEmail.js
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER, // full Gmail address
    pass: process.env.EMAIL_APP_PASS, // 16-char App Password
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000, // 10s
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

exports.otpEmail = async ({ to, userName, otp, expiresInSeconds }) => {
  try {
    // Optional: helps catch SMTP issues early
    await transporter.verify();

    const templatePath = path.join(
      __dirname,
      "../ComposedEmails/OtpEmail.html"
    );

    let htmlContent = fs.readFileSync(templatePath, "utf-8");

    htmlContent = htmlContent
      .replace(/{{userName}}/g, userName)
      .replace(/{{otp}}/g, otp)
      .replace(/{{expiresIn}}/g, expiresInSeconds.toString());

    const info = await transporter.sendMail({
      from: `"PawfectCare" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your PawfectCare Verification Code",
      html: htmlContent,
    });

    console.log("OTP email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("OTP email error:", error);
    throw error; // let controller handle response
  }
};
