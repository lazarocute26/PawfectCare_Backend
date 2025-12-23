// Templates/EmailSenders/OtpEmail.js
const fs = require("fs");
const path = require("path");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY); // put your re_xxx key in .env

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

    const { data, error } = await resend.emails.send({
      from: "PawfectCare <no-reply@send.pawfectcaredeploy.com>", // or your verified domain
      to,
      subject: "Your PawfectCare Verification Code",
      html: htmlContent,
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
