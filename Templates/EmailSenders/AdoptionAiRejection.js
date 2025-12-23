// Templates/EmailSenders/AdoptionEmail.js
const fs = require("fs");
const path = require("path");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Send via Resend
    const { data, error } = await resend.emails.send({
      from: "PawfectCare <no-reply@send.pawfectcaredeploy.com>", // or your verified domain
      to,
      subject:
        type === "approved" ? "Adoption Approved ✅" : "Adoption Rejected ❌",
      html: htmlContent,
    });

    if (error) {
      console.error("Adoption email error:", error);
      return res
        .status(500)
        .json({ success: false, error: error.message || "Email error" });
    }

    console.log("Adoption email sent:", data?.id);
    return res.status(200).json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error("Adoption email error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
