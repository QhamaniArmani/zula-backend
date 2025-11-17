// routes/subscriptions.js
import express from "express";
import Driver from "../models/Driver.js";

const router = express.Router();

// Predefined subscription plans
const subscriptionPlans = [
  {
    id: "basic",
    name: "Basic Plan",
    description: "Perfect for part-time drivers",
    price: 299,
    currency: "ZAR",
    commissionRate: 15,
    features: ["Up to 20 rides per week", "Basic support", "Standard app features"],
    maxWeeklyRides: 20
  },
  {
    id: "professional",
    name: "Professional Plan",
    description: "For full-time drivers",
    price: 599,
    currency: "ZAR",
    commissionRate: 12,
    features: ["Unlimited rides", "Priority support", "Advanced analytics", "Priority ride matching"],
    maxWeeklyRides: null
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    description: "For fleet owners",
    price: 999,
    currency: "ZAR",
    commissionRate: 10,
    features: ["Multiple drivers", "Dedicated account manager", "Custom reporting", "API access"],
    maxWeeklyRides: null
  }
];

// 📋 GET all subscriptions (root endpoint)
router.get("/", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Subscription endpoints available",
      endpoints: {
        plans: "/api/subscriptions/plans",
        driverSubscription: "/api/subscriptions/driver/:driverId", 
        activate: "/api/subscriptions/activate"
      },
      data: subscriptionPlans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving subscriptions",
      error: error.message
    });
  }
});

// 📋 GET all subscription plans - ADDED THIS ROUTE
router.get("/plans", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Subscription plans retrieved successfully",
      data: subscriptionPlans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving subscription plans",
      error: error.message
    });
  }
});

// 👤 GET driver's current subscription
router.get("/driver/:driverId", async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.driverId);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    res.json({
      success: true,
      message: "Driver subscription retrieved successfully",
      data: {
        subscriptionStatus: driver.subscriptionStatus,
        driverId: driver._id,
        driverName: driver.name
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving driver subscription",
      error: error.message
    });
  }
});

// 💳 ACTIVATE subscription for driver
router.post("/activate", async (req, res) => {
  try {
    const { driverId, planId } = req.body;

    if (!driverId || !planId) {
      return res.status(400).json({
        success: false,
        message: "Driver ID and plan ID are required"
      });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    const plan = subscriptionPlans.find(p => p.id === planId);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found"
      });
    }

    // Update driver subscription
    driver.subscriptionStatus = "active";
    await driver.save();

    res.json({
      success: true,
      message: "Subscription activated successfully",
      data: {
        driver: {
          id: driver._id,
          name: driver.name,
          subscriptionStatus: driver.subscriptionStatus
        },
        plan: {
          name: plan.name,
          price: plan.price,
          commissionRate: plan.commissionRate
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error activating subscription",
      error: error.message
    });
  }
});

export default router;