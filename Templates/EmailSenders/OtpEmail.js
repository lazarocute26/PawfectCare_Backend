// Templates/EmailSenders/OtpEmail.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { google } = require("googleapis");
const db = require("../../config/db"); // adjust path to your DB module

// ENV variables required:
// GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_REDIRECT_URI

const GMAIL_USER = process.env.GMAIL_USER;
const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;
const REDIRECT_URI = process.env.GMAIL_REDIRECT_URI; // e.g. http://localhost:5173/oauth2callback

// OAuth2 client (same client you used to obtain GMAIL_REFRESH_TOKEN)
const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

async function sendGmail({ to, subject, html }) {
  const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

  const rawMessage = [
    `From: Pawfect Care <${GMAIL_USER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");

  const encodedMessage = Buffer.from(rawMessage)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });

  return res.data;
}

// Send a single OTP email
exports.otpEmail = async function ({ to, userName, otp, expiresInSeconds }) {
  try {
    const templatePath = path.join(
      __dirname,
      "../ComposedEmails/OtpEmail.html"
    );

    let htmlContent = fs.readFileSync(templatePath, "utf-8");

    htmlContent = htmlContent
      .replace(/{{userName}}/g, userName)
      .replace(/{{otp}}/g, otp)
      .replace(/{{expiresIn}}/g, String(expiresInSeconds ?? ""));

    const data = await sendGmail({
      to,
      subject: "Your PawfectCare Verification Code",
      html: htmlContent,
    });

    console.log("OTP email sent via Gmail API:", data.id);
    return data;
  } catch (error) {
    console.error(
      "OTP email error:",
      error.response?.data || error.message || error
    );
    return;
  }
};
