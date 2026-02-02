// backend/controllers/ReportController.js
const db = require("../config/db");

const parseDate = (v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

// GET /process/report/raw?from=YYYY-MM-DD&to=YYYY-MM-DD
exports.getRawReport = (req, res) => {
  const from = parseDate(req.query.from) || "1970-01-01";
  const to = parseDate(req.query.to) || "2999-12-31";

  // 1) Approved adoptions: pet + adopter info
  const qApprovedAdoptions = `
    SELECT
      ad.adoption_id,
      ad.pet_id,
      p.name       AS pet_name,
      p.breed      AS pet_breed,
      p.pet_type,
      ad.user_id   AS adopter_id,
      u.first_name AS adopter_first_name,
      u.last_name  AS adopter_last_name,
      u.email      AS adopter_email,
      ad.dateRequested,
      ad.dateAdopted,
      ad.purpose_of_adoption,
      ad.status
    FROM adoption ad
    JOIN pet  p ON p.pet_id = ad.pet_id
    JOIN user u ON u.user_id = ad.user_id
    WHERE ad.status = 'Approved'
      AND ad.dateRequested BETWEEN ? AND ?
    ORDER BY ad.dateRequested DESC, ad.adoption_id DESC
  `;

  // 2) Approved appointments: owner + appointment info
  const qApprovedAppointments = `
    SELECT
      a.appointment_id,
      a.user_id,
      u.first_name,
      u.last_name,
      u.email,
      a.appointment_type,
      a.review       AS status,
      a.appointment_date,
      a.timeSchedule
    FROM appointment a
    JOIN user u ON u.user_id = a.user_id
    WHERE a.review = 'Accepted'
      AND a.appointment_date BETWEEN ? AND ?
    ORDER BY a.appointment_date DESC,
             a.timeSchedule DESC,
             a.appointment_id DESC
  `;

  db.query(qApprovedAdoptions, [from, to], (errAdoptions, rowsAdoptions) => {
    if (errAdoptions) {
      console.error("Approved adoptions report error:", errAdoptions);
      return res
        .status(500)
        .json({ message: "DB error (adoptions)", error: errAdoptions });
    }

    db.query(
      qApprovedAppointments,
      [from, to],
      (errAppointments, rowsAppointments) => {
        if (errAppointments) {
          console.error("Approved appointments report error:", errAppointments);
          return res
            .status(500)
            .json({
              message: "DB error (appointments)",
              error: errAppointments,
            });
        }

        return res.status(200).json({
          range: { from, to },
          approvedAdoptions: rowsAdoptions || [],
          approvedAppointments: rowsAppointments || [],
        });
      },
    );
  });
};
