// routes/drivers.js
import express from "express";
import Driver from "../models/Driver.js";

const router = express.Router();

// 🚗 GET all drivers
router.get("/", async (req, res) => {
  try {
    const drivers = await Driver.find();
    res.json({
      success: true,
      message: "Drivers retrieved successfully",
      data: drivers,
      count: drivers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving drivers",
      error: error.message
    });
  }
});

// 📍 GET nearby available drivers - THIS COMES BEFORE :id
router.get("/nearby", async (req, res) => {
  try {
    const { lat, lng, maxDistance = 10 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required parameters"
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const distance = parseFloat(maxDistance);

    const nearbyDrivers = await Driver.find({
      isAvailable: true,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          $maxDistance: distance * 1000
        }
      }
    }).limit(20);

    res.json({
      success: true,
      message: "Nearby drivers found successfully",
      data: nearbyDrivers,
      count: nearbyDrivers.length,
      searchLocation: {
        latitude,
        longitude,
        maxDistance: distance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error finding nearby drivers",
      error: error.message
    });
  }
});

// 👤 GET driver by ID
router.get("/:id", async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }
    res.json({
      success: true,
      message: "Driver retrieved successfully",
      data: driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving driver",
      error: error.message
    });
  }
});

// ➕ CREATE a new driver
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, vehicleType, licensePlate, location } = req.body;
    
    if (!name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and phone are required"
      });
    }

    const driver = new Driver({
      name,
      email,
      phone,
      vehicleType: vehicleType || "Sedan",
      licensePlate: licensePlate || "",
      location: location || { 
        type: "Point",
        coordinates: [28.0473, -26.2041],
        address: "Johannesburg, South Africa"
      }
    });

    const savedDriver = await driver.save();

    res.status(201).json({
      success: true,
      message: "Driver created successfully",
      data: savedDriver
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
    }
    res.status(500).json({
      success: false,
      message: "Error creating driver",
      error: error.message
    });
  }
});
// 📍 UPDATE driver location
router.patch("/:id/location", async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { 
        location: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)], // [longitude, latitude]
          address: address || ""
        },
        isAvailable: true
      },
      { new: true }
    );
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    res.json({
      success: true,
      message: "Driver location updated successfully",
      data: driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating driver location",
      error: error.message
    });
  }
});
// 📍 UPDATE driver location
router.patch("/:id/location", async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required"
      });
    }

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { 
        location: {
          type: "Point",
          coordinates: [parseFloat(lng), parseFloat(lat)], // [longitude, latitude]
          address: address || ""
        },
        isAvailable: true
      },
      { new: true }
    );
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    res.json({
      success: true,
      message: "Driver location updated successfully",
      data: driver
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating driver location",
      error: error.message
    });
  }
});
export default router;