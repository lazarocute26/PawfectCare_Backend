const fs = require("fs");
const path = require("path");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

exports.acceptedAppointment = async (req, res) => {
  try {
    const { to, userName, appointmentDate, appointmentTime, type, status } =
      req.body;

    const templateFile =
      type === "consultation"
        ? "consultationAccepted.html"
        : "vaccinationAccepted.html";

    const templatePath = path.join(
      __dirname,
      `../ComposedEmails/${templateFile}`
    );
    let htmlContent = fs.readFileSync(templatePath, "utf-8");

    htmlContent = htmlContent
      .replace(/{{userName}}/g, userName)
      .replace(/{{date}}/g, appointmentDate)
      .replace(/{{time}}/g, appointmentTime);

    const { data, error } = await resend.emails.send({
      from: "PawfectCare",
      to,
      subject:
        status === "approved" ? "Appointment Approved" : "Appointment Rejected",
      html: htmlContent,
    });

    if (error) {
      console.error("Accepted appointment email error:", error);
      return res
        .status(500)
        .json({ success: false, error: error.message || "Email error" });
    }

    console.log("Accepted appointment email sent:", data?.id);
    return res.status(200).json({ success: true, messageId: data?.id });
  } catch (error) {
    console.error("Accepted appointment email error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
