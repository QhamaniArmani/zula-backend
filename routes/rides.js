// routes/rides.js
import express from "express";
import Ride from "../models/Ride.js";
import Driver from "../models/Driver.js";

const router = express.Router();

// Temporary in-memory storage for testing
let rides = [];
let rideIdCounter = 1;

// 🚗 REQUEST a new ride
router.post("/", async (req, res) => {
  try {
    const { passengerId, passengerName, passengerPhone, pickupLocation, destination, rideType, paymentMethod } = req.body;

    // Basic validation
    if (!passengerId || !passengerName || !passengerPhone || !pickupLocation || !destination) {
      return res.status(400).json({
        success: false,
        message: "Passenger details, pickup location, and destination are required"
      });
    }

    const newRide = {
      id: `ride_${rideIdCounter++}`,
      passengerId,
      passengerName,
      passengerPhone,
      pickupLocation,
      destination,
      rideType: rideType || "Standard",
      paymentMethod: paymentMethod || "Cash",
      status: "requested",
      driverId: null,
      fare: null,
      distance: null,
      duration: null,
      requestedAt: new Date().toISOString(),
      acceptedAt: null,
      startedAt: null,
      completedAt: null
    };

    rides.push(newRide);

    res.status(201).json({
      success: true,
      message: "Ride requested successfully",
      data: newRide
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error requesting ride",
      error: error.message
    });
  }
});

// 📋 GET all rides
router.get("/", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Rides retrieved successfully",
      data: rides,
      count: rides.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving rides",
      error: error.message
    });
  }
});

// 👤 GET rides by passenger ID
router.get("/passenger/:passengerId", async (req, res) => {
  try {
    const passengerRides = rides.filter(ride => ride.passengerId === req.params.passengerId);
    
    res.json({
      success: true,
      message: "Passenger rides retrieved successfully",
      data: passengerRides,
      count: passengerRides.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving passenger rides",
      error: error.message
    });
  }
});

// 🚙 GET rides by driver ID
router.get("/driver/:driverId", async (req, res) => {
  try {
    const driverRides = rides.filter(ride => ride.driverId === req.params.driverId);
    
    res.json({
      success: true,
      message: "Driver rides retrieved successfully",
      data: driverRides,
      count: driverRides.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving driver rides",
      error: error.message
    });
  }
});

// ✅ ACCEPT a ride
router.patch("/:id/accept", async (req, res) => {
  try {
    const { driverId, estimatedFare, estimatedDistance, estimatedDuration } = req.body;
    const ride = rides.find(r => r.id === req.params.id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });
    }

    if (ride.status !== "requested") {
      return res.status(400).json({
        success: false,
        message: `Ride cannot be accepted. Current status: ${ride.status}`
      });
    }

    ride.driverId = driverId;
    ride.fare = estimatedFare;
    ride.distance = estimatedDistance;
    ride.duration = estimatedDuration;
    ride.status = "accepted";
    ride.acceptedAt = new Date().toISOString();

    res.json({
      success: true,
      message: "Ride accepted successfully",
      data: ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error accepting ride",
      error: error.message
    });
  }
});

// ▶️ START a ride
router.patch("/:id/start", async (req, res) => {
  try {
    const ride = rides.find(r => r.id === req.params.id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });
    }

    if (ride.status !== "accepted") {
      return res.status(400).json({
        success: false,
        message: `Ride cannot be started. Current status: ${ride.status}`
      });
    }

    ride.status = "in_progress";
    ride.startedAt = new Date().toISOString();

    res.json({
      success: true,
      message: "Ride started successfully",
      data: ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error starting ride",
      error: error.message
    });
  }
});

// 🏁 COMPLETE a ride
router.patch("/:id/complete", async (req, res) => {
  try {
    const { finalFare, actualDistance, actualDuration } = req.body;
    const ride = rides.find(r => r.id === req.params.id);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });
    }

    if (ride.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: `Ride cannot be completed. Current status: ${ride.status}`
      });
    }

    ride.status = "completed";
    ride.fare = finalFare || ride.fare;
    ride.distance = actualDistance || ride.distance;
    ride.duration = actualDuration || ride.duration;
    ride.completedAt = new Date().toISOString();

    res.json({
      success: true,
      message: "Ride completed successfully",
      data: ride
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error completing ride",
      error: error.message
    });
  }
});

export default router;