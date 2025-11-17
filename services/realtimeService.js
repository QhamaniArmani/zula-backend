class RealtimeService {
  constructor(io) {
    this.io = io;
  }

  // Notify driver about new ride request
  notifyDriverNewRide(driverId, rideData) {
    this.io.to(`driver-${driverId}`).emit("new-ride-request", {
      ...rideData,
      timestamp: new Date().toISOString()
    });
    console.log(`📨 Notified driver ${driverId} about new ride`);
  }

  // Notify passenger about ride status
  notifyPassengerRideUpdate(passengerId, updateData) {
    this.io.to(`passenger-${passengerId}`).emit("ride-update", {
      ...updateData,
      timestamp: new Date().toISOString()
    });
    console.log(`📨 Notified passenger ${passengerId} about ride update`);
  }

  // Notify driver about ride cancellation
  notifyDriverRideCancelled(driverId, rideData) {
    this.io.to(`driver-${driverId}`).emit("ride-cancelled", {
      ...rideData,
      timestamp: new Date().toISOString()
    });
    console.log(`📨 Notified driver ${driverId} about ride cancellation`);
  }

  // Broadcast driver's online status
  broadcastDriverOnline(driverId) {
    this.io.emit("driver-online", { driverId });
  }

  // Broadcast driver's offline status
  broadcastDriverOffline(driverId) {
    this.io.emit("driver-offline", { driverId });
  }

  // Send notification to user
  sendNotification(userId, userType, notification) {
    const room = userType === 'driver' ? `driver-${userId}` : `passenger-${userId}`;
    this.io.to(room).emit("notification", {
      ...notification,
      timestamp: new Date().toISOString()
    });
    console.log(`📢 Sent notification to ${userType} ${userId}`);
  }

  // Get online drivers count
  getOnlineDriversCount() {
    const driversRoom = this.io.sockets.adapter.rooms.get('drivers-online');
    return driversRoom ? driversRoom.size : 0;
  }

  // Check if user is online
  isUserOnline(userId, userType) {
    const room = userType === 'driver' ? `driver-${userId}` : `passenger-${userId}`;
    const userRoom = this.io.sockets.adapter.rooms.get(room);
    return userRoom ? userRoom.size > 0 : false;
  }
}

export default RealtimeService;