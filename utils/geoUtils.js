// utils/geoUtils.js

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - {latitude, longitude}
 * @param {Object} coord2 - {latitude, longitude} 
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in kilometers
  const lat1 = coord1.latitude * Math.PI / 180;
  const lat2 = coord2.latitude * Math.PI / 180;
  const deltaLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const deltaLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate estimated travel time between two points
 * @param {number} distance - Distance in kilometers
 * @param {number} averageSpeed - Average speed in km/h (default: 25km/h for city driving)
 * @returns {number} Estimated time in minutes
 */
export function calculateEstimatedTime(distance, averageSpeed = 25) {
  const timeInHours = distance / averageSpeed;
  return Math.round(timeInHours * 60); // Convert to minutes
}

/**
 * Check if a driver is within acceptable distance from pickup
 * @param {Object} driverLocation - {latitude, longitude}
 * @param {Object} pickupLocation - {latitude, longitude}
 * @param {number} maxDistance - Maximum distance in kilometers (default: 10km)
 * @returns {boolean} True if driver is within range
 */
export function isDriverInRange(driverLocation, pickupLocation, maxDistance = 10) {
  const distance = calculateDistance(driverLocation, pickupLocation);
  return distance <= maxDistance;
}

/**
 * Generate a random location within radius of a point (for testing)
 * @param {Object} center - {latitude, longitude}
 * @param {number} radius - Radius in kilometers
 * @returns {Object} Random location {latitude, longitude}
 */
export function generateRandomLocation(center, radius = 5) {
  const radiusInDegrees = radius / 111; // Approximate conversion
  
  const randomLat = center.latitude + (Math.random() - 0.5) * radiusInDegrees;
  const randomLon = center.longitude + (Math.random() - 0.5) * radiusInDegrees;
  
  return {
    latitude: Math.round(randomLat * 1000000) / 1000000,
    longitude: Math.round(randomLon * 1000000) / 1000000
  };
}

/**
 * Calculate bearing between two points
 * @param {Object} start - {latitude, longitude}
 * @param {Object} end - {latitude, longitude}
 * @returns {number} Bearing in degrees
 */
export function calculateBearing(start, end) {
  const startLat = start.latitude * Math.PI / 180;
  const startLon = start.longitude * Math.PI / 180;
  const endLat = end.latitude * Math.PI / 180;
  const endLon = end.longitude * Math.PI / 180;

  const y = Math.sin(endLon - startLon) * Math.cos(endLat);
  const x = Math.cos(startLat) * Math.sin(endLat) -
            Math.sin(startLat) * Math.cos(endLat) * Math.cos(endLon - startLon);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360; // Normalize to 0-360
}