const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Register a new user
exports.registerUser = async (req, res) => {
  try {
    //Destructure fields from req.body
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

    //Check for missing fields
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

    //Normalize enum fields
    const normalizedSex = sex.toLowerCase();
    const role = "pet owner"; // default

    //Check if email already exists
    const checkEmailQuery = "SELECT * FROM user WHERE email = ?";
    db.query(checkEmailQuery, [email], async (err, result) => {
      if (err) {
        console.error("Email check error:", err);
        return res.status(500).json({ message: "Database error" });
      }

      if (result.length > 0) {
        return res.status(400).json({ message: "Email already registered" });
      }

      //Hash password properly
      const hashedPassword = await bcrypt.hash(password, 10);

      //Insert query
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
// User login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    db.query(
      "SELECT * FROM user WHERE email = ?",
      [email],
      async (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ message: "Database error", error: err.message });
        }

        if (results.length === 0) {
          return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return res.status(401).json({ message: "Invalid email or password" });
        }

        // Generate JWT with role
        const token = jwt.sign(
          { user_id: user.user_id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(200).json({
          message: "Login successful",
          token,
          user: {
            user_id: user.user_id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            role: user.role, // important
          },
        });
      }
    );
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

// Get logged-in user info
exports.me = (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

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

        res.status(200).json(results[0]);
      }
    );
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
// Create booking (using logged-in user)
exports.createBooking = (req, res) => {
  try {
    const { appointment_type, appointment_date, timeschedule } = req.body;

    // Validate input
    if (!appointment_type || !appointment_date || !timeschedule) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Get logged-in user (from auth middleware)
    const userId = req.user?.user_id; // make sure your auth middleware sets req.user

    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User not logged in" });
    }

    // Insert booking into appointment table
    const insertQuery = `
      INSERT INTO appointment (user_id, appointment_type, appointment_date, timeschedule, review)
      VALUES (?, ?, ?, ?,'Pending')
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

        db.query(userQuery, [userId], (err, userResult) => {
          if (err) {
            console.error("User fetch error:", err);
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
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
