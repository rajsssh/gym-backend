import { Server } from "socket.io";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5174",
        "http://localhost:5173",
        "http://localhost:5175",
        "https://gym-latest-new.netlify.app",
        "https://gym-speed-fitness.netlify.app",
        "https://speedfitness.live",
        "https://gym-mgt-0.netlify.app",
        "https://gym-kiaan.netlify.app",
        "https://gymsoftware.space"
      ],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    socket.on("join_room", (userId) => {
      socket.join(userId.toString());
      console.log(`👤 User ${userId} joined room ${userId}`);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    console.warn("Socket.io not initialized!");
  }
  return io;
};

export const emitToUser = (userId, eventName, payload) => {
  if (io) {
    io.to(userId.toString()).emit(eventName, payload);
    console.log(`🚀 Emitted '${eventName}' to room '${userId}'`);
  }
};
