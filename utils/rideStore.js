// utils/rideStore.js
// In-memory storage for real-time ride management
export const rideStore = {
  // Active rides
  rides: {},
  
  // Available drivers
  availableDrivers: new Set(),
  
  // Ride requests waiting for drivers
  pendingRides: [],
  
  // Initialize ride in store
  addRide(rideId, rideData) {
    this.rides[rideId] = {
      ...rideData,
      createdAt: Date.now(),
      status: 'pending'
    };
  },
  
  // Get ride by ID
  getRide(rideId) {
    return this.rides[rideId];
  },
  
  // Update ride status
  updateRideStatus(rideId, status, updateData = {}) {
    if (this.rides[rideId]) {
      this.rides[rideId] = {
        ...this.rides[rideId],
        status,
        ...updateData,
        updatedAt: Date.now()
      };
    }
  },
  
  // Remove ride from store
  removeRide(rideId) {
    delete this.rides[rideId];
  },
  
  // Add available driver
  addAvailableDriver(driverId) {
    this.availableDrivers.add(driverId);
  },
  
  // Remove available driver
  removeAvailableDriver(driverId) {
    this.availableDrivers.delete(driverId);
  },
  
  // Get available drivers count
  getAvailableDriversCount() {
    return this.availableDrivers.size;
  },
  
  // Add pending ride request
  addPendingRide(rideData) {
    this.pendingRides.push({
      ...rideData,
      requestedAt: Date.now()
    });
  },
  
  // Get next pending ride
  getNextPendingRide() {
    return this.pendingRides.shift();
  },
  
  // Get all active rides
  getActiveRides() {
    return Object.values(this.rides).filter(ride => 
      ['pending', 'accepted', 'in_progress'].includes(ride.status)
    );
  },
  
  // Clean up old completed rides (optional)
  cleanupCompletedRides(maxAge = 3600000) { // 1 hour
    const now = Date.now();
    Object.keys(this.rides).forEach(rideId => {
      const ride = this.rides[rideId];
      if (ride.status === 'completed' && (now - ride.updatedAt) > maxAge) {
        this.removeRide(rideId);
      }
    });
  }
};

export default rideStore;