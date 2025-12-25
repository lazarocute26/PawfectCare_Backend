// controllers/userController.js
const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// helper to create tokens
const createAccessToken = (user) =>
  jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

const createRefreshToken = (user) =>
  jwt.sign({ user_id: user.user_id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });

// REGISTER
exports.registerUser = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      monthly_salary,
      birthdate,
      age,
      sex,
      address,
      password,
    } = req.body;

    if (
      !first_name ||
      !last_name ||
      !email ||
      !monthly_salary ||
      !birthdate ||
      !age ||
      !sex ||
      !address ||
      !password
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const normalizedSex = sex.toLowerCase();
    const role = "pet owner";

    const checkEmailQuery = "SELECT * FROM user WHERE email = ?";
    db.query(checkEmailQuery, [email], async (err, result) => {
      if (err) {
        console.error("Email check error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (result.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const insertUser = `
        INSERT INTO user
        (first_name, last_name, email, monthly_salary, birthdate, age, sex, address, password, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.query(
        insertUser,
        [
          first_name,
          last_name,
          email,
          monthly_salary,
          birthdate,
          age,
          normalizedSex,
          address || null,
          hashedPassword,
          role,
        ],
        (err) => {
          if (err) {
            console.error("Insert error:", err);
            return res.status(500).json({ message: "Error inserting user" });
          }

          return res
            .status(201)
            .json({ message: "User registered successfully" });
        }
      );
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    db.query(
      "SELECT * FROM user WHERE email = ?",
      [email],
      async (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });

        if (results.length === 0) {
          return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return res.status(401).json({ message: "Invalid email or password" });
        }

        const accessToken = createAccessToken(user);
        const refreshToken = createRefreshToken(user);

        // save refresh in DB
        db.query(
          "INSERT INTO auth_refresh_tokens (user_id, refresh_token, expires_at, revoked) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), 0)",
          [user.user_id, refreshToken],
          (err) => {
            if (err) {
              console.error("Refresh insert error:", err);
              return res.status(500).json({ message: "Database insert error" });
            }

            // set httpOnly cookie
            res.cookie("refreshToken", refreshToken, {
              httpOnly: true,
              sameSite: "None", // cross-site
              secure: true, // required for SameSite=None on HTTPS
              maxAge: 30 * 24 * 60 * 60 * 1000,
            });

            return res.status(200).json({
              message: "Login successful",
              access_token: accessToken,
              refresh_token: refreshToken,
              user: {
                user_id: user.user_id,
                role: user.role,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
              },
            });
          }
        );
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// REFRESH ACCESS TOKEN
exports.refreshToken = (req, res) => {
  // 1. Read refresh token from HttpOnly cookie or (optionally) from body
  const refreshToken = req.cookies?.refreshToken || req.body?.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh token required" });
  }

  // 2. Check token exists and is not revoked in DB
  const findTokenSql = `
    SELECT * 
    FROM auth_refresh_tokens 
    WHERE refresh_token = ? AND revoked = 0
  `;

  db.query(findTokenSql, [refreshToken], (err, results) => {
    if (err) {
      console.error("Refresh DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // 3. Verify the JWT itself
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      (verifyErr, decoded) => {
        if (verifyErr) {
          console.error("Refresh verify error:", verifyErr);
          return res.status(401).json({ message: "Invalid refresh token" });
        }

        const user_id = decoded.user_id;

        // 4. Load user and issue a new access token
        db.query(
          "SELECT * FROM user WHERE user_id = ?",
          [user_id],
          (userErr, userResults) => {
            if (userErr) {
              console.error("User fetch error:", userErr);
              return res.status(500).json({ message: "Database error" });
            }

            if (userResults.length === 0) {
              return res.status(404).json({ message: "User not found" });
            }

            const user = userResults[0];
            const newAccessToken = createAccessToken(user);

            // Optionally you could also rotate the refresh token here.

            return res.status(200).json({
              access_token: newAccessToken,
            });
          }
        );
      }
    );
  });
};

exports.createBooking = (req, res) => {
  try {
    const { appointment_type, appointment_date, timeschedule } = req.body;

    // Validate input
    if (!appointment_type || !appointment_date || !timeschedule) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Get logged-in user (from auth middleware)
    const userId = req.user?.user_id;

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User not logged in" });
    }

    // ==== NEW: check if slot already booked for that date ====
    const checkQuery = `
      SELECT 1
      FROM appointment
      WHERE appointment_date = ?
        AND timeSchedule = ?
      LIMIT 1
    `;

    db.query(
      checkQuery,
      [appointment_date, timeschedule],
      (checkErr, checkRows) => {
        if (checkErr) {
          console.error("Slot check error:", checkErr);
          return res
            .status(500)
            .json({ message: "Failed to check slot availability" });
        }

        if (checkRows.length > 0) {
          // slot already taken
          return res.status(409).json({
            message: "This time slot is already booked for that date.",
          });
        }

        // ==== ORIGINAL INSERT (runs only if slot is free) ====
        const insertQuery = `
          INSERT INTO appointment (user_id, appointment_type, appointment_date, timeSchedule, review)
          VALUES (?, ?, ?, ?, 'Pending')
        `;

        db.query(
          insertQuery,
          [userId, appointment_type, appointment_date, timeschedule],
          (err, result) => {
            if (err) {
              console.error("Insert error:", err);
              return res.status(500).json({ message: "Database error" });
            }

            const appointmentId = result.insertId;

            // Fetch user details from user table
            const userQuery = `
              SELECT user_id, first_name, last_name, email 
              FROM user 
              WHERE user_id = ?
            `;

            db.query(userQuery, [userId], (userErr, userResult) => {
              if (userErr) {
                console.error("User fetch error:", userErr);
                return res.status(500).json({ message: "Database error" });
              }

              if (userResult.length === 0) {
                return res.status(404).json({ message: "User not found" });
              }

              const user = userResult[0];

              return res.status(201).json({
                message: "Booking created successfully",
                appointment_id: appointmentId,
                user: {
                  user_id: user.user_id,
                  full_name: `${user.first_name} ${user.last_name}`,
                  email: user.email,
                },
                appointment: {
                  appointment_type,
                  appointment_date,
                  timeschedule,
                },
              });
            });
          }
        );
      }
    );
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// LOGOUT
exports.logout = (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refresh_token;

  if (refreshToken) {
    db.query(
      "UPDATE auth_refresh_tokens SET revoked = 1 WHERE refresh_token = ?",
      [refreshToken],
      () => {}
    );
  }

  res.clearCookie("refreshToken");
  return res.status(200).json({ message: "Logged out" });
};

// ME
exports.me = (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    db.query(
      "SELECT * FROM user WHERE user_id = ?",
      [decoded.user_id],
      (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });

        if (results.length === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        const user = results[0];
        res.status(200).json({
          user_id: user.user_id,
          email: user.email,
          role: user.role,
          first_name: user.first_name,
          last_name: user.last_name,
        });
      }
    );
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// VERIFY REGISTRATION OTP (120s validity)
exports.verifyRegistrationOtp = (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: "Email and OTP code are required" });
  }

  const selectSql = `
    SELECT id, email, code, created_at
    FROM otp
    WHERE email = ?
      AND code = ?
      AND created_at >= NOW() - INTERVAL 120 SECOND
    ORDER BY id DESC
    LIMIT 1
  `;

  db.query(selectSql, [email, code], (err, rows) => {
    if (err) {
      console.error("OTP verify DB error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (rows.length === 0) {
      return res.status(400).json({
        message: "Invalid or expired OTP. Please request a new code.",
      });
    }

    const otpId = rows[0].id;

    // Optional: delete or mark OTP as used so it cannot be reused
    db.query("DELETE FROM otp WHERE id = ?", [otpId], (delErr) => {
      if (delErr) {
        console.error("OTP delete error:", delErr);
        // Do not fail verification just because delete failed
      }

      return res.status(200).json({ message: "OTP verified" });
    });
  });
};

// LOGOUT
exports.logout = (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refresh_token;

  if (!refreshToken) {
    // no token, just clear cookie and return OK
    res.clearCookie("refreshToken");
    return res.status(200).json({ message: "Logged out" });
  }

  // mark refresh token as revoked in DB
  db.query(
    "UPDATE auth_refresh_tokens SET revoked = 1 WHERE refresh_token = ?",
    [refreshToken],
    (err) => {
      if (err) {
        console.error("Logout DB error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      // clear httpOnly cookie
      res.clearCookie("refreshToken");
      return res.status(200).json({ message: "Logged out" });
    }
  );
};

// NOTIFICATIONS: appointments + adoptions for logged-in user
exports.getNotifications = (req, res) => {
  try {
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const sql = `
      SELECT 
        'appointment' AS type,
        a.appointment_id AS id,
        a.appointment_type,
        a.review,
        a.appointment_date,
        a.timeSchedule,
        NULL AS dateRequested,
        NULL AS purpose_of_adoption,
        NULL AS status
      FROM appointment a
      WHERE a.user_id = ?

      UNION ALL

      SELECT 
        'adoption' AS type,
        ad.adoption_id AS id,
        NULL AS appointment_type,
        NULL AS review,
        NULL AS appointment_date,
        NULL AS timeSchedule,
        ad.dateRequested,
        ad.purpose_of_adoption,
        ad.status
      FROM adoption ad
      WHERE ad.user_id = ?

      ORDER BY appointment_date IS NULL, appointment_date DESC, dateRequested DESC, id DESC
    `;

    db.query(sql, [userId, userId], (err, rows) => {
      if (err) {
        console.error("Notifications DB error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      return res.status(200).json({ notifications: rows });
    });
  } catch (error) {
    console.error("Notifications server error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
