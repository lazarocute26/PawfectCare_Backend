// middleware/auth.js - CREATE THIS
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Access token required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verify user exists
    db.query(
      "SELECT * FROM user WHERE user_id = ?",
      [decoded.user_id],
      (err, results) => {
        if (err || results.length === 0) {
          return res.status(401).json({ message: "Invalid token" });
        }

        req.user = results[0]; // ✅ Attach user to req
        next();
      }
    );
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = auth;
