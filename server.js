import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Use your MongoDB Atlas connection string
const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB Atlas Connected Successfully!");
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

connectDB();

// Health endpoint
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
  
  res.json({
    status: "OK",
    service: "ZulaRides API",
    database: dbStatus,
    environment: process.env.NODE_ENV || "production",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    realtime: "Socket.io ready"
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "🚗 ZulaRides Backend API Running",
    status: "Active",
    database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
    environment: process.env.NODE_ENV || "production",
    endpoints: {
      health: "/health"
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ZulaRides Server running on port ${PORT}`);
});
