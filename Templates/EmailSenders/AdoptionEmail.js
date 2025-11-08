const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

exports.adoptionEmail = async (req, res) => {
  try {
    const { to, userName, petName, type } = req.body;

    // Pick template file
    const templateFile =
      type === "approved" ? "adoptionAccepted.html" : "adoptionRejected.html";

    const templatePath = path.join(
      __dirname,
      `../ComposedEmails/${templateFile}`
    );
    let htmlContent = fs.readFileSync(templatePath, "utf-8");

    // Replace placeholders
    htmlContent = htmlContent
      .replace(/{{userName}}/g, userName)
      .replace(/{{petName}}/g, petName);

    // Setup mailer
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"PawfectCare" <${process.env.EMAIL_USER}>`,
      to,
      subject:
        type === "approved" ? "Adoption Approved ✅" : "Adoption Rejected ❌",
      html: htmlContent,
    });

    console.log("Message sent:", info.messageId, info.envelope);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Email error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
