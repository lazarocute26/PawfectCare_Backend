// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const http = require("http");

const { initSocket } = require("./socket");

const dashboardRoutes = require("./routes/dashboardRoutes");
const petRoutes = require("./routes/petRoutes");
const userRoutes = require("./routes/userRoutes");
const processRoutes = require("./routes/ProcessRoutes");
const adoptionEmailRoutes = require("./routes/adoptionEmailRoutes");
const appointmentEmailRoutes = require("./routes/appointmentEmailRoutes");
const conversationRoutes = require("./routes/conversationRoutes");

const app = express();

const corsOptions = {
  origin: [process.env.FRONTEND_URL1],
  credentials: true, //
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.json({ limit: "10mb" }));
// Routes
app.use("/dashboard", dashboardRoutes);
app.use("/pets", petRoutes);
app.use("/users", userRoutes);
app.use("/process", processRoutes);
app.use("/adoption", adoptionEmailRoutes);
app.use("/appointment", appointmentEmailRoutes);
app.use("/conversations", conversationRoutes);

// ----- HTTP + Socket.IO setup -----
const server = http.createServer(app);

// this sets up ONE Socket.IO server and handlers inside socket.js
initSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
