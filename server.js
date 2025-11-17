// server.js — Updated with Enhanced Real-time Features and Fixed Routes
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

// Route imports
import driverRoutes from "./routes/drivers.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import rideRoutes from "./routes/rides.js";
import pricingRoutes from "./routes/pricingRoutes.js";
import passengerRoutes from "./routes/passengerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import analyticsRoutes from './routes/analyticsRoutes.js';
import cancellationRoutes from './routes/cancellationRoutes.js';
import { setupDefaultCancellationPolicy } from './utils/setupCancellationPolicy.js';
import ratingRoutes from './routes/ratingRoutes.js';
import './utils/ratingCron.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { setupDefaultNotificationTemplates } from './utils/setupNotificationTemplates.js';
import './utils/notificationCron.js';

// �� FIXED: Import all route files
import walletRoutes from './routes/walletRoutes.js';
import walletTopupRoutes from './routes/walletTopupRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import rideHistoryRoutes from './routes/rideHistoryRoutes.js';

// 🆕 Import rideController for payment routes
import {
  completeRide,
  cancelRide,
  getRidePayment,
  updatePaymentMethod
} from './controllers/rideController.js';

// 🆕 Phase 3 In-Memory Ride Storage Test Routes
import rideTestRoutes from './routes/rideTestRoutes.js';

// 🆕 Phase 3 Ride Lifecycle Socket Handlers
import { setupRideLifecycleHandlers } from './socket/rideLifecycleHandlers.js';

// Real-time services
import RealtimeService from "./services/realtimeService.js";
import { setRealtimeService } from "./controllers/rideController.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001", 
      "http://localhost:5173",
      "https://zularides.co.za",
      "https://www.zularides.co.za"
    ],
    methods: ["GET", "POST"]
  },
  // Add connection settings for better performance
  pingTimeout: 60000,
  pingInterval: 25000
});

// ✅ Environment Variables
const PORT = process.env.PORT || 5002;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/zularides";
const NODE_ENV = process.env.NODE_ENV || "development";

// 🛡️ Security Middleware - FIXED: Remove duplicates
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// 🌍 CORS Configuration - FIXED: Remove duplicates
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "https://zularides.co.za",
    "https://www.zularides.co.za",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

// 🧠 Body Parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// 🔐 Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// 🗄️ MongoDB Connection Function with Retry Logic
const connectDB = async (retries = 5, delay = 5000) => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error (${retries} retries left):`, error.message);

    if (retries > 0) {
      console.log(`🔄 Retrying connection in ${delay / 1000} seconds...`);
      setTimeout(() => connectDB(retries - 1, delay), delay);
    } else {
      console.error("�� Maximum retry attempts reached. Check your MongoDB configuration.");
      process.exit(1);
    }
  }
};

// 🔌 MongoDB Connection Events
mongoose.connection.on("connected", async () => {
  console.log("🚀 Mongoose connected to MongoDB");
  
  console.log("🔧 Starting cancellation policy setup...");
  try {
    console.log("📁 Importing setup function...");
    const { setupDefaultCancellationPolicy } = await import('./utils/setupCancellationPolicy.js');
    console.log("✅ Setup function imported successfully");
    
    console.log("🔄 Calling setup function...");
    await setupDefaultCancellationPolicy();
    setupDefaultNotificationTemplates();
    console.log("✅ Cancellation policy setup completed");
  } catch (error) {
    console.error("❌ Cancellation policy setup failed:", error.message);
    console.error("📋 Full error:", error);
  }
});

// Initialize real-time service
const realtimeService = new RealtimeService(io);
setRealtimeService(realtimeService);

// Make io accessible to controllers
app.set('io', io);

// Enhanced Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);
  
  // Store user information with socket
  socket.userData = {
    socketId: socket.id,
    connectedAt: new Date()
  };

  // 🚗 Driver joins with authentication
  socket.on("driver-join", (data) => {
    const { driverId, token } = data;
    
    // In production, you would verify the JWT token here
    socket.userData.driverId = driverId;
    socket.userData.role = 'driver';
    socket.join(`driver-${driverId}`);
    socket.join('drivers-online');
    
    console.log(`🚗 Driver ${driverId} joined room: driver-${driverId}`);
    
    // Notify that driver is online
    socket.broadcast.emit("driver-online", { driverId });
  });

  // 👤 Passenger joins with authentication
  socket.on("passenger-join", (data) => {
    const { passengerId, token } = data;
    
    // In production, you would verify the JWT token here
    socket.userData.passengerId = passengerId;
    socket.userData.role = 'passenger';
    socket.join(`passenger-${passengerId}`);
    
    console.log(`👤 Passenger ${passengerId} joined`);
  });

  // 📍 Real-time driver location updates
  socket.on("driver-location-update", (data) => {
    const { driverId, location, heading, speed } = data;
    
    if (socket.userData.driverId !== driverId) {
      console.warn(`⚠️ Unauthorized location update attempt from ${socket.id}`);
      return;
    }

    console.log(`📍 Driver ${driverId} location:`, location);
    
    // Update driver's location in database (optional)
    // await Driver.findByIdAndUpdate(driverId, { location });
    
    // Broadcast to all passengers (in production, only broadcast to relevant passengers)
    socket.broadcast.emit("driver-location-changed", {
      driverId,
      location,
      heading,
      speed,
      timestamp: new Date().toISOString()
    });
  });

  // 🔍 Passenger requests nearby drivers
  socket.on("request-nearby-drivers", (data) => {
    const { passengerId, location, maxDistance = 5 } = data;
    
    // In a real app, query MongoDB for nearby drivers
    // For now, we'll broadcast to all drivers in the area
    socket.broadcast.emit("passenger-requesting-ride", {
      passengerId,
      location,
      maxDistance,
      timestamp: new Date().toISOString()
    });
  });

  // 🚗 Ride status updates with real-time notifications
  socket.on("ride-status-update", async (data) => {
    const { rideId, status, driverId, passengerId, location, estimatedArrival } = data;
    
    console.log(`🔄 Ride ${rideId} status: ${status}`);
    
    // Notify both driver and passenger
    io.to(`driver-${driverId}`).emit("ride-status-changed", data);
    io.to(`passenger-${passengerId}`).emit("ride-status-changed", data);
    
    // Broadcast to relevant parties based on status
    switch (status) {
      case 'accepted':
        io.to(`passenger-${passengerId}`).emit("driver-assigned", data);
        break;
      case 'driver_en_route':
        io.to(`passenger-${passengerId}`).emit("driver-en-route", data);
        break;
      case 'arrived':
        io.to(`passenger-${passengerId}`).emit("driver-arrived", data);
        break;
      case 'in_progress':
        io.to(`passenger-${passengerId}`).emit("ride-started", data);
        break;
      case 'completed':
        io.to(`passenger-${passengerId}`).emit("ride-completed", data);
        io.to(`driver-${driverId}`).emit("ride-completed", data);
        break;
    }
  });

  // 💬 Real-time chat between driver and passenger
  socket.on("send-message", (data) => {
    const { rideId, from, to, message, senderType } = data;
    
    console.log(`💬 Message in ride ${rideId}: ${message}`);
    
    // Send to the other party
    if (senderType === 'driver') {
      io.to(`passenger-${to}`).emit("receive-message", {
        ...data,
        timestamp: new Date().toISOString()
      });
    } else {
      io.to(`driver-${to}`).emit("receive-message", {
        ...data,
        timestamp: new Date().toISOString()
      });
    }
  });

  // 📍 Live ride tracking (passenger can see driver moving)
  socket.on("ride-location-update", (data) => {
    const { rideId, driverId, passengerId, location, heading, speed } = data;
    
    // Send location update to passenger
    io.to(`passenger-${passengerId}`).emit("driver-location-update", {
      rideId,
      location,
      heading,
      speed,
      timestamp: new Date().toISOString()
    });
  });

  // 🆘 Emergency/SOS feature
  socket.on("emergency-alert", (data) => {
    const { rideId, userId, userType, location, message } = data;
    
    console.log(`🆘 EMERGENCY ALERT from ${userType} ${userId}`);
    
    // Notify platform admins and emergency contacts
    io.to('admin').emit("emergency-alert", {
      ...data,
      timestamp: new Date().toISOString()
    });
    
    // Also notify the other party in the ride
    if (userType === 'driver') {
      // Get passenger ID from ride data and notify them
      io.to(`passenger-${data.passengerId}`).emit("emergency-alert", data);
    } else {
      // Get driver ID from ride data and notify them
      io.to(`driver-${data.driverId}`).emit("emergency-alert", data);
    }
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`🔌 User disconnected: ${socket.id} - Reason: ${reason}`);
    
    // Notify if driver went offline
    if (socket.userData.driverId) {
      socket.broadcast.emit("driver-offline", { 
        driverId: socket.userData.driverId 
      });
    }
  });

  // Handle connection errors
  socket.on("error", (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// 🆕 ADD THIS LINE - Phase 3 Ride Lifecycle Handlers (OUTSIDE the connection handler)
setupRideLifecycleHandlers(io);

// Handle graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("🛑 MongoDB connection closed due to app termination");
  process.exit(0);
});

// Initialize connection
connectDB();

// 🧭 Health Check
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
  res.status(200).json({
    status: "OK",
    service: "ZulaRides API",
    database: dbStatus,
    environment: NODE_ENV,
    uptime: `${process.uptime().toFixed(2)}s`,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    realtime: "Socket.io enabled"
  });
});

// 🆕 Temporary test route
app.post('/api/test-rides/simple-test', (req, res) => {
  console.log('✅ Simple test route hit!');
  res.json({
    success: true,
    message: 'Simple test route works!',
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test-rides/simple-get', (req, res) => {
  res.json({
    success: true,
    message: 'Simple GET route works!'
  });
});

// 📦 API Routes - FIXED: Organized and complete
app.use("/api/drivers", driverRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/rides", rideRoutes);
app.use("/api/pricing", pricingRoutes);
app.use("/api/passengers", passengerRoutes);
app.use("/api/auth", authRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/cancellations', cancellationRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/notifications', notificationRoutes);

// 🆕 FIXED: Wallet and payment routes
app.use('/api/wallets', walletRoutes);
app.use('/api/wallet/topup', walletTopupRoutes);

// 🆕 FIXED: Feedback routes
app.use('/api/feedback', feedbackRoutes);

// 🆕 FIXED: Ride history routes
app.use('/api/ride-history', rideHistoryRoutes);

// 🆕 Payment-related ride routes
app.post('/api/rides/:id/complete', completeRide);
app.post('/api/rides/:id/cancel', cancelRide);
app.get('/api/rides/:id/payment', getRidePayment);
app.put('/api/rides/:id/payment', updatePaymentMethod);

// 🆕 Phase 3 In-Memory Ride Storage Test Routes
app.use('/api/test-rides', rideTestRoutes);

// 🐛 DEBUG: Test route to verify all routes are mounted
app.get('/api/debug-routes', (req, res) => {
  const routes = [];
  
  // Check all registered routes
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods).join(',')} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      // This is a router middleware
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          routes.push(`${Object.keys(handler.route.methods).join(',')} ${handler.route.path}`);
        }
      });
    }
  });
  
  res.json({
    success: true,
    message: 'All registered routes',
    totalRoutes: routes.length,
    routes: routes.filter(route => route.includes('/api/')).sort(),
    categories: {
      drivers: routes.filter(route => route.includes('/api/drivers')).length,
      rides: routes.filter(route => route.includes('/api/rides')).length,
      wallets: routes.filter(route => route.includes('/api/wallet')).length,
      feedback: routes.filter(route => route.includes('/api/feedback')).length,
      history: routes.filter(route => route.includes('/api/ride-history')).length
    }
  });
});

// 🌐 Root Test Route
app.get("/", (req, res) => {
  res.json({
    message: "🚗 ZulaRides Backend API Running",
    status: "Active",
    environment: NODE_ENV,
    realtime: "Socket.io enabled",
    endpoints: {
      health: "/health",
      drivers: "/api/drivers",
      subscriptions: "/api/subscriptions",
      rides: "/api/rides",
      pricing: "/api/pricing",
      passengers: "/api/passengers",
      auth: "/api/auth",
      wallets: "/api/wallets",
      feedback: "/api/feedback",
      rideHistory: "/api/ride-history",
      debug: "/api/debug-routes"
    },
    version: "1.0.0",
  });
});

// 🚫 404 for API
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found`,
  });
});

// ⚠️ Global Error Handler
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err);

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, message: `${field} already exists` });
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: "Validation Error", errors });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ success: false, message: "Invalid ID format" });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 🚀 Start Server with Socket.io
httpServer.listen(PORT, () => {
  console.log(`
🎉 ZulaRides Server Started!
📍 Port: ${PORT}
🌍 Environment: ${NODE_ENV}
🗄️ MongoDB: ${MONGODB_URI}
🔌 Socket.io: Enabled
🕒 ${new Date().toLocaleString()}
�� http://localhost:${PORT}/health
  `);
});

export default app;
