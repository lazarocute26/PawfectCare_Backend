const fs = require("fs");
const path = require("path");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.rejectedAppointment = async (req, res) => {
  try {
    const { to, userName, type, status } = req.body;

    const templateFile =
      type === "consultation"
        ? "consultationRejected.html"
        : "vaccinationRejected.html";

    const templatePath = path.join(
      __dirname,
      `../ComposedEmails/${templateFile}`
    );
    let htmlContent = fs.readFileSync(templatePath, "utf-8");

    htmlContent = htmlContent.replace(/{{userName}}/g, userName);

    const { data, error } = await resend.emails.send({
      from: "PawfectCare <onboarding@resend.dev>",
      to,
      subject:
        status === "approved" ? "Appointment Approved" : "Appointment Rejected",
      html: htmlContent,
    });

    if (error) {
      console.error("Rejected appointment email error:", error);
      return res
        .status(500)
        .json({ success: false, error: error.message || "Email error" });
    }

    console.log("Rejected appointment email sent:", data?.id);
    return res.status(200).json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error("Rejected appointment email error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
