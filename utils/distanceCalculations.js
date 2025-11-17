// utils/distanceCalculations.js

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1  
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Convert degrees to radians
 * @param {number} degrees 
 * @returns {number} radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate estimated travel time based on distance and traffic conditions
 * @param {number} distance - Distance in kilometers
 * @param {string} trafficCondition - Traffic condition: 'light', 'moderate', 'heavy'
 * @returns {number} Estimated time in minutes
 */
export function calculateEstimatedTime(distance, trafficCondition = 'moderate') {
  // Average speeds in km/h for different traffic conditions
  const averageSpeeds = {
    light: 50,    // Free flow traffic
    moderate: 30, // Normal city traffic
    heavy: 15,    // Heavy traffic
    severe: 10    // Gridlock
  };
  
  const speed = averageSpeeds[trafficCondition] || averageSpeeds.moderate;
  const timeInHours = distance / speed;
  const timeInMinutes = timeInHours * 60;
  
  return Math.round(timeInMinutes);
}

/**
 * Calculate fare based on distance, time, and other factors
 * @param {number} distance - Distance in kilometers
 * @param {number} duration - Duration in minutes
 * @param {string} vehicleType - Type of vehicle
 * @param {number} surgeMultiplier - Surge pricing multiplier
 * @returns {Object} Fare breakdown
 */
export function calculateFare(distance, duration, vehicleType = 'standard', surgeMultiplier = 1.0) {
  // Competitive rates 10-15% lower than Uber/Bolt (in ZAR)
  const baseRates = {
    standard: {
      baseFare: 20,        // Uber/Bolt: ~23-25 ZAR
      perKm: 9,           // Uber/Bolt: ~10-11 ZAR
      perMinute: 1.5,     // Uber/Bolt: ~1.7-2 ZAR
      minimumFare: 35     // Uber/Bolt: ~40 ZAR
    },
    premium: {
      baseFare: 35,       // Uber/Bolt: ~40-45 ZAR
      perKm: 14,          // Uber/Bolt: ~16-18 ZAR
      perMinute: 2.5,     // Uber/Bolt: ~3-3.5 ZAR
      minimumFare: 55     // Uber/Bolt: ~65 ZAR
    },
    luxury: {
      baseFare: 50,       // Uber/Bolt: ~60-65 ZAR
      perKm: 20,          // Uber/Bolt: ~25-28 ZAR
      perMinute: 4,       // Uber/Bolt: ~5-6 ZAR
      minimumFare: 85     // Uber/Bolt: ~100 ZAR
    }
  };
  
  const rates = baseRates[vehicleType] || baseRates.standard;
  
  // Calculate fare components
  const baseFare = rates.baseFare;
  const distanceFare = distance * rates.perKm;
  const timeFare = duration * rates.perMinute;
  
  // Calculate total before surge
  let totalFare = baseFare + distanceFare + timeFare;
  
  // Apply surge multiplier
  totalFare = totalFare * surgeMultiplier;
  
  // Ensure minimum fare
  totalFare = Math.max(totalFare, rates.minimumFare);
  
  // Calculate surge amount
  const surgeAmount = totalFare - (baseFare + distanceFare + timeFare);
  
  return {
    baseFare: Math.round(rates.baseFare * 100) / 100,
    distanceFare: Math.round(distanceFare * 100) / 100,
    timeFare: Math.round(timeFare * 100) / 100,
    surgeMultiplier,
    surgeAmount: Math.round(surgeAmount * 100) / 100,
    totalFare: Math.round(totalFare * 100) / 100,
    currency: 'ZAR',
    breakdown: {
      base: Math.round(rates.baseFare * 100) / 100,
      distance: Math.round(distanceFare * 100) / 100,
      time: Math.round(timeFare * 100) / 100,
      surge: Math.round(surgeAmount * 100) / 100
    }
  };
}

/**
 * Calculate surge pricing based on demand and supply
 * @param {number} availableDrivers - Number of available drivers
 * @param {number} rideRequests - Number of active ride requests
 * @param {string} timeOfDay - 'peak' or 'off-peak'
 * @returns {number} Surge multiplier
 */
export function calculateSurgeMultiplier(availableDrivers, rideRequests, timeOfDay = 'off-peak') {
  const driverToRequestRatio = availableDrivers / Math.max(rideRequests, 1);
  
  let baseMultiplier = 1.0;
  
  // Base surge based on supply/demand ratio
  if (driverToRequestRatio < 0.2) baseMultiplier = 2.0;    // High demand
  else if (driverToRequestRatio < 0.5) baseMultiplier = 1.5; // Medium demand
  else if (driverToRequestRatio < 0.8) baseMultiplier = 1.2; // Low demand
  
  // Time-based surge
  if (timeOfDay === 'peak') {
    baseMultiplier *= 1.3; // 30% increase during peak hours
  }
  
  // Cap the surge multiplier
  return Math.min(baseMultiplier, 3.0);
}

/**
 * Find nearby drivers within a specified radius
 * @param {Array} drivers - Array of driver objects with location
 * @param {Object} location - Target location {latitude, longitude}
 * @param {number} maxDistance - Maximum distance in kilometers
 * @returns {Array} Array of nearby drivers
 */
export function findNearbyDrivers(drivers, location, maxDistance = 5) {
  return drivers.filter(driver => {
    if (!driver.location || !driver.location.latitude || !driver.location.longitude) {
      return false;
    }
    
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      driver.location.latitude,
      driver.location.longitude
    );
    
    return distance <= maxDistance;
  });
}

/**
 * Calculate route efficiency (percentage of optimal route)
 * @param {number} actualDistance - Actual distance traveled
 * @param {number} optimalDistance - Optimal distance
 * @returns {number} Efficiency percentage (0-100)
 */
export function calculateRouteEfficiency(actualDistance, optimalDistance) {
  if (optimalDistance <= 0) return 100;
  
  const efficiency = (optimalDistance / actualDistance) * 100;
  return Math.min(Math.max(efficiency, 0), 100); // Clamp between 0 and 100
}

// Export all functions as default as well for convenience
export default {
  calculateDistance,
  calculateEstimatedTime,
  calculateFare,
  calculateSurgeMultiplier,
  findNearbyDrivers,
  calculateRouteEfficiency
};