
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const reservationRoutes = require("./routes/reservationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5176",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5176"
];

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    try {
      const { protocol, hostname } = new URL(origin);
      const localHost = ["localhost", "127.0.0.1", "[::1]"].includes(hostname);

      if (protocol === "http:" && localHost) {
        return callback(null, true);
      }
    } catch {
      return callback(new Error("Invalid request origin."));
    }

    return callback(new Error("Origin is not allowed by CORS."));
  }
}));

app.use(express.json());
app.use("/api/auth", authRoutes);
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Resort Booking API is running",
    database: mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected"
  });
});

app.use("/api/rooms", roomRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found"
  });
});

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
