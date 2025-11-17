import Driver from '../models/Driver.js';
import Subscription from '../models/Subscription.js';

// Get all drivers
export const getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.find().populate('subscription');
    res.json({
      success: true,
      data: drivers
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching drivers'
    });
  }
};

// Get driver by ID
export const getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id).populate('subscription');
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error('Error fetching driver:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching driver'
    });
  }
};

// Create new driver
export const createDriver = async (req, res) => {
  try {
    const driver = new Driver(req.body);
    await driver.save();
    
    res.status(201).json({
      success: true,
      message: 'Driver created successfully',
      data: driver
    });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating driver'
    });
  }
};

// Update driver
export const updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('subscription');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.json({
      success: true,
      message: 'Driver updated successfully',
      data: driver
    });
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating driver'
    });
  }
};

// Delete driver
export const deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.json({
      success: true,
      message: 'Driver deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting driver'
    });
  }
};

// Get nearby drivers
export const getNearbyDrivers = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance = 5 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const nearbyDrivers = await Driver.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: maxDistance * 1000 // Convert km to meters
        }
      },
      isActive: true,
      availability: 'available'
    }).populate('subscription');

    res.json({
      success: true,
      data: nearbyDrivers,
      count: nearbyDrivers.length
    });
  } catch (error) {
    console.error('Error fetching nearby drivers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby drivers'
    });
  }
};

// Update driver location
export const updateDriverLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      {
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        lastActive: new Date()
      },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.json({
      success: true,
      message: 'Driver location updated successfully',
      data: driver
    });
  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating driver location'
    });
  }
};