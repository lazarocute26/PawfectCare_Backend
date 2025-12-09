// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");

const dashboardRoutes = require("./routes/dashboardRoutes");
const petRoutes = require("./routes/petRoutes");
const userRoutes = require("./routes/userRoutes");
const processRoutes = require("./routes/ProcessRoutes");
const adoptionEmailRoutes = require("./routes/adoptionEmailRoutes");
const appointmentEmailRoutes = require("./routes/appointmentEmailRoutes");
const conversationRoutes = require("./routes/conversationRoutes");

const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL1, // e.g. "http://localhost:5173"
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// Routes
app.use("/dashboard", dashboardRoutes);
app.use("/pets", petRoutes);
app.use("/users", userRoutes);
app.use("/process", processRoutes);
app.use("/adoption", adoptionEmailRoutes);
app.use("/appointment", appointmentEmailRoutes);
app.use("/conversations", conversationRoutes);

// ----- Socket.IO setup -----
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL1,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🔌 socket connected:", socket.id);

  socket.on("join_conversation", (conversationId) => {
    socket.join(`conversation:${conversationId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔌 socket disconnected:", socket.id);
  });
});

// export io so controllers can emit events
module.exports.io = io;

// start HTTP + WebSocket server
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
