import pricingService from '../services/pricingService.js';
import PricingModel from '../models/PricingModel.js';
import SurgePricing from '../models/SurgePricing.js';

export const getFareEstimate = async (req, res) => {
  try {
    const { pickup, destination, vehicleType = 'standard' } = req.body;

    // Validate required fields
    if (!pickup || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and destination coordinates are required'
      });
    }

    const estimate = await pricingService.getFareEstimate(
      pickup, 
      destination, 
      vehicleType
    );

    res.json({
      success: true,
      data: estimate
    });

  } catch (error) {
    console.error('Error getting fare estimate:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error calculating fare estimate'
    });
  }
};

export const updatePricingModel = async (req, res) => {
  try {
    const { vehicleType } = req.params;
    const updateData = req.body;

    const pricingModel = await PricingModel.findOneAndUpdate(
      { name: vehicleType },
      updateData,
      { new: true, runValidators: true }
    );

    if (!pricingModel) {
      return res.status(404).json({
        success: false,
        message: `Pricing model not found for vehicle type: ${vehicleType}`
      });
    }

    res.json({
      success: true,
      message: 'Pricing model updated successfully',
      data: pricingModel
    });

  } catch (error) {
    console.error('Error updating pricing model:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating pricing model'
    });
  }
};

export const createSurgePricing = async (req, res) => {
  try {
    const surgePricing = new SurgePricing(req.body);
    await surgePricing.save();

    res.status(201).json({
      success: true,
      message: 'Surge pricing area created successfully',
      data: surgePricing
    });

  } catch (error) {
    console.error('Error creating surge pricing:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating surge pricing area'
    });
  }
};

export const getActiveSurgeAreas = async (req, res) => {
  try {
    const surgeAreas = await SurgePricing.find({ active: true });

    res.json({
      success: true,
      data: surgeAreas
    });

  } catch (error) {
    console.error('Error fetching surge areas:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching surge pricing areas'
    });
  }
};