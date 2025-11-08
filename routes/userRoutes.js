const express = require("express");
const UserController = require("../controllers/UserController");
const auth = require("../middleware/auth");
const router = express.Router();

// Register new user
router.post("/register", UserController.registerUser);

// Login existing user
router.post("/login", UserController.login);

// Get logged-in user info
router.get("/me", auth, UserController.me);

// Books a user
router.post("/booking", auth, UserController.createBooking);

module.exports = router;
