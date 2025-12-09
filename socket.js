// backend/socket.js
const { Server } = require("socket.io");

let io = null;

function initSocket(server) {
  io = new Server(server, {
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

  return io;
}

function getIO() {
  if (!io) {
    throw new Error(
      "Socket.io not initialized. Call initSocket(server) first."
    );
  }
  return io;
}

module.exports = { initSocket, getIO };
