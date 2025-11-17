// services/fareService.js
import { calculateDistance, calculateEstimatedTime } from '../utils/geoUtils.js';

class FareService {
  constructor() {
    // Base pricing configuration (in ZAR)
    this.pricingConfig = {
      standard: {
        baseFare: 25,
        perKm: 8,
        perMinute: 1.5,
        minimumFare: 40
      },
      premium: {
        baseFare: 40,
        perKm: 12,
        perMinute: 2.5,
        minimumFare: 70
      },
      luxury: {
        baseFare: 60,
        perKm: 18,
        perMinute: 4,
        minimumFare: 120
      }
    };
  }

  /**
   * Calculate surge multiplier based on demand
   * @param {number} availableDrivers - Number of available drivers
   * @param {number} pendingRides - Number of pending ride requests
   * @param {string} timeOfDay - 'peak' or 'off-peak'
   * @returns {number} Surge multiplier
   */
  calculateSurgeMultiplier(availableDrivers, pendingRides, timeOfDay = 'off-peak') {
    let surge = 1.0;
    
    // Base surge based on driver-to-rider ratio
    const ratio = availableDrivers > 0 ? pendingRides / availableDrivers : 2;
    
    if (ratio > 1.5) surge *= 1.5;
    else if (ratio > 1.0) surge *= 1.2;
    
    // Time-based surge
    if (timeOfDay === 'peak') {
      surge *= 1.3;
    }
    
    // Cap surge at 3.0x
    return Math.min(surge, 3.0);
  }

  /**
   * Calculate time-based multiplier (for traffic, etc.)
   * @param {number} estimatedTime - Estimated travel time in minutes
   * @param {string} timeOfDay - 'peak' or 'off-peak'
   * @returns {number} Time multiplier
   */
  calculateTimeMultiplier(estimatedTime, timeOfDay = 'off-peak') {
    let multiplier = 1.0;
    
    // Longer trips get slightly higher time rates
    if (estimatedTime > 30) multiplier *= 1.1;
    if (estimatedTime > 60) multiplier *= 1.2;
    
    // Peak hours adjustment
    if (timeOfDay === 'peak') {
      multiplier *= 1.25;
    }
    
    return multiplier;
  }

  /**
   * Estimate fare for a ride
   * @param {Object} pickup - {latitude, longitude, address}
   * @param {Object} destination - {latitude, longitude, address}
   * @param {string} vehicleType - 'standard', 'premium', 'luxury'
   * @param {Object} options - Additional options
   * @returns {Object} Fare breakdown
   */
  estimateFare(pickup, destination, vehicleType = 'standard', options = {}) {
    const config = this.pricingConfig[vehicleType];
    if (!config) {
      throw new Error(`Invalid vehicle type: ${vehicleType}`);
    }

    // Calculate distance and time
    const distance = calculateDistance(
      { latitude: pickup.latitude, longitude: pickup.longitude },
      { latitude: destination.latitude, longitude: destination.longitude }
    );
    
    const estimatedTime = calculateEstimatedTime(distance);
    
    // Calculate surge and time multipliers
    const surgeMultiplier = options.surgeMultiplier || this.calculateSurgeMultiplier(
      options.availableDrivers || 10,
      options.pendingRides || 0,
      options.timeOfDay
    );
    
    const timeMultiplier = this.calculateTimeMultiplier(estimatedTime, options.timeOfDay);

    // Calculate fare components
    const baseFare = config.baseFare;
    const distanceFare = distance * config.perKm;
    const timeFare = estimatedTime * config.perMinute * timeMultiplier;
    
    // Calculate total before surge
    let totalFare = baseFare + distanceFare + timeFare;
    
    // Apply surge multiplier
    totalFare *= surgeMultiplier;
    
    // Ensure minimum fare
    totalFare = Math.max(totalFare, config.minimumFare);
    
    // Round to nearest 0.5
    totalFare = Math.round(totalFare * 2) / 2;

    return {
      baseFare,
      distance,
      distanceFare: Math.round(distanceFare * 100) / 100,
      time: estimatedTime,
      timeFare: Math.round(timeFare * 100) / 100,
      surgeMultiplier: Math.round(surgeMultiplier * 100) / 100,
      timeMultiplier: Math.round(timeMultiplier * 100) / 100,
      totalFare,
      currency: 'ZAR',
      breakdown: {
        base: baseFare,
        distance: Math.round(distanceFare * 100) / 100,
        time: Math.round(timeFare * 100) / 100,
        surge: Math.round((baseFare + distanceFare + timeFare) * (surgeMultiplier - 1) * 100) / 100,
        timeBased: Math.round(timeFare * 100) / 100
      }
    };
  }

  /**
   * Calculate actual fare after ride completion
   * @param {number} actualDistance - Actual distance traveled in km
   * @param {number} actualTime - Actual time taken in minutes
   * @param {Object} originalEstimate - Original fare estimate
   * @returns {Object} Actual fare breakdown
   */
  calculateActualFare(actualDistance, actualTime, originalEstimate) {
    const config = this.pricingConfig[originalEstimate.vehicleType || 'standard'];
    
    const baseFare = config.baseFare;
    const distanceFare = actualDistance * config.perKm;
    const timeFare = actualTime * config.perMinute * originalEstimate.timeMultiplier;
    
    let totalFare = baseFare + distanceFare + timeFare;
    totalFare *= originalEstimate.surgeMultiplier;
    totalFare = Math.max(totalFare, config.minimumFare);
    totalFare = Math.round(totalFare * 2) / 2;

    return {
      ...originalEstimate,
      actualDistance,
      actualTime,
      actualTotalFare: totalFare,
      fareDifference: totalFare - originalEstimate.totalFare,
      breakdown: {
        base: baseFare,
        distance: Math.round(distanceFare * 100) / 100,
        time: Math.round(timeFare * 100) / 100,
        surge: Math.round((baseFare + distanceFare + timeFare) * (originalEstimate.surgeMultiplier - 1) * 100) / 100
      }
    };
  }

  /**
   * Get pricing configuration for frontend display
   * @returns {Object} Pricing configuration
   */
  getPricingConfig() {
    return this.pricingConfig;
  }

  /**
   * Update pricing configuration (admin function)
   * @param {string} vehicleType - Vehicle type to update
   * @param {Object} newConfig - New pricing configuration
   */
  updatePricingConfig(vehicleType, newConfig) {
    if (!this.pricingConfig[vehicleType]) {
      throw new Error(`Invalid vehicle type: ${vehicleType}`);
    }
    
    this.pricingConfig[vehicleType] = {
      ...this.pricingConfig[vehicleType],
      ...newConfig
    };
    
    return this.pricingConfig[vehicleType];
  }
}

export default new FareService();