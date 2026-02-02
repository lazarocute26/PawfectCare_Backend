// backend/controllers/ReportController.js
const db = require("../config/db");

const parseDate = (v) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

exports.getRawReport = (req, res) => {
  // optional filters: /api/reports/raw?from=2026-01-01&to=2026-02-02
  const from = parseDate(req.query.from) || "1970-01-01";
  const to = parseDate(req.query.to) || "2999-12-31";

  // 1) KPIs
  const qOverview = `
    SELECT
      (SELECT COUNT(*) FROM user) AS totalUsers,
      (SELECT COUNT(*) FROM pet) AS totalPets,
      (SELECT COUNT(*) FROM appointment WHERE DATE(appointment_date) BETWEEN ? AND ?) AS appointmentsInRange,
      (SELECT COUNT(*) FROM adoption WHERE DATE(dateRequested) BETWEEN ? AND ?) AS adoptionsInRange,
      (SELECT COUNT(*) FROM adoption WHERE status = 'Pending' AND DATE(dateRequested) BETWEEN ? AND ?) AS pendingAdoptionsInRange,
      (SELECT COUNT(*) FROM appointment WHERE review = 'Pending' AND DATE(appointment_date) BETWEEN ? AND ?) AS pendingAppointmentsInRange
  `;

  // 2) Adoption status counts
  const qAdoptionByStatus = `
    SELECT status, COUNT(*) AS total
    FROM adoption
    WHERE DATE(dateRequested) BETWEEN ? AND ?
    GROUP BY status
    ORDER BY total DESC
  `;

  // 3) Daily trends
  const qAdoptionsDaily = `
    SELECT DATE(dateRequested) AS day, COUNT(*) AS total
    FROM adoption
    WHERE DATE(dateRequested) BETWEEN ? AND ?
    GROUP BY DATE(dateRequested)
    ORDER BY day ASC
  `;

  const qAppointmentsDaily = `
    SELECT DATE(appointment_date) AS day, COUNT(*) AS total
    FROM appointment
    WHERE DATE(appointment_date) BETWEEN ? AND ?
    GROUP BY DATE(appointment_date)
    ORDER BY day ASC
  `;

  // 4) Optional: appointments by type
  const qAppointmentsByType = `
    SELECT appointment_type, COUNT(*) AS total
    FROM appointment
    WHERE DATE(appointment_date) BETWEEN ? AND ?
    GROUP BY appointment_type
    ORDER BY total DESC
  `;

  // Run queries (nested callbacks to keep your current style)
  db.query(qOverview, [from, to, from, to, from, to, from, to], (e1, r1) => {
    if (e1) return res.status(500).json({ message: "DB error", error: e1 });

    db.query(qAdoptionByStatus, [from, to], (e2, r2) => {
      if (e2) return res.status(500).json({ message: "DB error", error: e2 });

      db.query(qAdoptionsDaily, [from, to], (e3, r3) => {
        if (e3) return res.status(500).json({ message: "DB error", error: e3 });

        db.query(qAppointmentsDaily, [from, to], (e4, r4) => {
          if (e4)
            return res.status(500).json({ message: "DB error", error: e4 });

          db.query(qAppointmentsByType, [from, to], (e5, r5) => {
            if (e5)
              return res.status(500).json({ message: "DB error", error: e5 });

            return res.status(200).json({
              range: { from, to },
              overview: r1?.[0] || {},
              adoptionByStatus: r2 || [],
              adoptionsDaily: r3 || [],
              appointmentsDaily: r4 || [],
              appointmentsByType: r5 || [],
            });
          });
        });
      });
    });
  });
};
