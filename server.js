// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

const dashboardRoutes = require("./routes/dashboardRoutes");
const petRoutes = require("./routes/petRoutes");
const userRoutes = require("./routes/userRoutes");
const processRoutes = require("./routes/ProcessRoutes");
const adoptionEmailRoutes = require("./routes/adoptionEmailRoutes");
const appointmentEmailRoutes = require("./routes/appointmentEmailRoutes");

const corsOptions = {
  origin: [process.env.FRONTEND_URL1, process.env.FRONTEND_URL2].filter(
    Boolean
  ),
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.json({ limit: "10mb" }));

//Routes
app.use("/dashboard", dashboardRoutes);
app.use("/pets", petRoutes);
app.use("/users", userRoutes);
app.use("/process", processRoutes);
app.use("/adoption", adoptionEmailRoutes);
app.use("/appointment", appointmentEmailRoutes);

app.listen(process.env.PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${process.env.PORT}`);
});
