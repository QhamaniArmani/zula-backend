// tests/completeRideSimulation.js
import { io } from 'socket.io-client';
import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';
const SOCKET_URL = 'http://localhost:5001';

// Test data
const PASSENGER_ID = 'passenger_sim_001';
const DRIVER_ID = 'driver_sim_001';
const PASSENGER_NAME = 'Thabo Mbeki';
const DRIVER_NAME = 'John Driver';

let currentRideId = null;
let socket = null;

console.log('🚗 ==========================================');
console.log('🚗 STARTING COMPLETE RIDE SIMULATION');
console.log('🚗 ==========================================');
console.log('👤 Passenger:', PASSENGER_NAME);
console.log('🚖 Driver:', DRIVER_NAME);
console.log('');

// Initialize simulation
async function startSimulation() {
  try {
    // Step 1: Clear any existing rides
    console.log('1. 🧹 Clearing existing rides...');
    await axios.delete(`${API_BASE}/test-rides/test-clear-rides`);
    console.log('   ✅ Rides cleared\n');

    // Step 2: Connect to socket server
    console.log('2. 🔌 Connecting to server...');
    socket = io(SOCKET_URL);
    
    await new Promise((resolve) => {
      socket.on('connect', () => {
        console.log('   ✅ Connected to server');
        resolve();
      });
    });

    // Step 3: Join as passenger and driver
    console.log('3. 👥 Joining rooms...');
    socket.emit('passenger:join', PASSENGER_ID);
    socket.emit('driver:join', DRIVER_ID);
    console.log('   ✅ Joined passenger and driver rooms\n');

    // Step 4: Passenger requests a ride
    console.log('4. 📱 Passenger requesting ride...');
    await requestRide();
    
  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
    process.exit(1);
  }
}

// Passenger requests a ride
async function requestRide() {
  const rideData = {
    passengerId: PASSENGER_ID,
    pickup: {
      address: "Mall of Africa, Johannesburg",
      coordinates: { latitude: -26.0543, longitude: 28.1032 }
    },
    destination: {
      address: "OR Tambo International Airport",
      coordinates: { latitude: -26.1330, longitude: 28.2480 }
    },
    vehicleType: "standard"
  };

  // Listen for ride response
  socket.once('ride:requested', (data) => {
    console.log('   ✅ Ride requested successfully');
    console.log('   📍 From:', rideData.pickup.address);
    console.log('   🎯 To:', rideData.destination.address);
    console.log('   💰 Estimated fare: ZAR', data.ride.pricing.totalFare);
    console.log('   📏 Distance:', data.ride.distance, 'km');
    console.log('   ⏱️ Estimated time:', data.ride.estimatedDuration, 'minutes\n');
    
    currentRideId = data.ride._id;
    
    // Wait 3 seconds then driver accepts
    setTimeout(() => driverAcceptsRide(), 3000);
  });

  socket.emit('ride:request', rideData);
}

// Driver accepts the ride
function driverAcceptsRide() {
  console.log('5. 🚖 Driver accepting ride...');
  
  socket.once('ride:accepted', (data) => {
    console.log('   ✅ Ride accepted by driver');
    console.log('   👤 Driver assigned:', DRIVER_NAME);
    console.log('   🕒 Accepted at:', new Date().toLocaleTimeString(), '\n');
    
    // Wait 3 seconds then driver starts ride
    setTimeout(() => driverStartsRide(), 3000);
  });

  socket.emit('ride:accept', {
    rideId: currentRideId,
    driverId: DRIVER_ID
  });
}

// Driver starts the ride (picked up passenger)
function driverStartsRide() {
  console.log('6. 🚦 Driver starting ride...');
  
  socket.once('ride:started', (data) => {
    console.log('   ✅ Ride started');
    console.log('   🕒 Started at:', new Date().toLocaleTimeString(), '\n');
    
    // Start simulating ride progress
    simulateRideProgress();
  });

  socket.emit('ride:start', {
    rideId: currentRideId
  });
}

// Simulate ride progress with location updates
function simulateRideProgress() {
  console.log('7. 📍 Simulating ride progress...');
  
  const routePoints = [
    { lat: -26.0543, lng: 28.1032, progress: 0, address: "Mall of Africa" },
    { lat: -26.0745, lng: 28.1245, progress: 25, address: "Midrand" },
    { lat: -26.0948, lng: 28.1567, progress: 50, address: "Kempton Park" },
    { lat: -26.1142, lng: 28.1987, progress: 75, address: "Airport Approach" },
    { lat: -26.1330, lng: 28.2480, progress: 100, address: "OR Tambo Airport" }
  ];

  let currentPoint = 0;
  
  const progressInterval = setInterval(() => {
    if (currentPoint >= routePoints.length) {
      clearInterval(progressInterval);
      completeRide();
      return;
    }

    const point = routePoints[currentPoint];
    
    console.log(`   🗺️  Progress: ${point.progress}% - ${point.address}`);
    console.log(`      📍 Location: ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`);
    
    // Send location update
    socket.emit('ride:location_update', {
      rideId: currentRideId,
      driverId: DRIVER_ID,
      passengerId: PASSENGER_ID,
      location: {
        latitude: point.lat,
        longitude: point.lng
      },
      heading: 45 + (currentPoint * 30),
      speed: 60 + (currentPoint * 5)
    });
    
    currentPoint++;
  }, 2000);
}

// Complete the ride
function completeRide() {
  console.log('\n8. 🏁 Completing ride...');
  
  // Calculate actual metrics (slightly different from estimates)
  const actualDistance = 28.5; // km
  const actualDuration = 38; // minutes
  
  socket.once('ride:completed', (data) => {
    console.log('   ✅ Ride completed successfully!');
    console.log('   🕒 Completed at:', new Date().toLocaleTimeString());
    console.log('');
    console.log('   📊 RIDE SUMMARY:');
    console.log('   ================');
    console.log('   📏 Distance traveled:', actualDistance, 'km');
    console.log('   ⏱️  Actual duration:', actualDuration, 'minutes');
    console.log('   💰 Final fare: ZAR', data.ride.pricing.totalFare);
    console.log('   🚗 Vehicle type:', data.ride.vehicleType);
    console.log('   👤 Passenger:', PASSENGER_NAME);
    console.log('   🚖 Driver:', DRIVER_NAME);
    console.log('');
    
    // Show fare breakdown
    showFareBreakdown(data.ride.pricing);
    
    // End simulation
    setTimeout(() => {
      console.log('🎉 ==========================================');
      console.log('🎉 RIDE SIMULATION COMPLETED SUCCESSFULLY!');
      console.log('🎉 ==========================================');
      process.exit(0);
    }, 2000);
  });

  socket.emit('ride:complete', {
    rideId: currentRideId,
    actualDistance: actualDistance,
    actualDuration: actualDuration
  });
}

// Show detailed fare breakdown
function showFareBreakdown(pricing) {
  console.log('   💵 FARE BREAKDOWN:');
  console.log('   ==================');
  console.log('   🏷️  Base fare: ZAR', pricing.baseFare);
  console.log('   📏 Distance (' + (pricing.distanceFare / 9).toFixed(1) + ' km): ZAR', pricing.distanceFare);
  console.log('   ⏱️  Time (' + (pricing.timeFare / 1.5).toFixed(0) + ' min): ZAR', pricing.timeFare);
  
  if (pricing.surgeMultiplier > 1.0) {
    console.log('   ⚡ Surge (' + pricing.surgeMultiplier + 'x): ZAR', pricing.surgeAmount);
  }
  
  console.log('   💰 TOTAL: ZAR', pricing.totalFare);
  console.log('');
  
  // Compare with competitors
  const uberEstimate = pricing.totalFare * 1.15; // 15% more expensive
  console.log('   💡 COMPETITIVE COMPARISON:');
  console.log('   ==========================');
  console.log('   🟢 ZulaRides: ZAR', pricing.totalFare);
  console.log('   🔴 Uber/Bolt estimate: ZAR', uberEstimate.toFixed(2));
  console.log('   💰 Savings: ZAR', (uberEstimate - pricing.totalFare).toFixed(2));
  console.log('   📈 Savings percentage: 15%');
}

// Error handling
function setupErrorHandling() {
  socket.on('ride:request_failed', (data) => {
    console.error('❌ Ride request failed:', data.message);
    process.exit(1);
  });

  socket.on('ride:accept_failed', (data) => {
    console.error('❌ Ride acceptance failed:', data.message);
    process.exit(1);
  });

  socket.on('ride:start_failed', (data) => {
    console.error('❌ Ride start failed:', data.message);
    process.exit(1);
  });

  socket.on('ride:complete_failed', (data) => {
    console.error('❌ Ride completion failed:', data.message);
    process.exit(1);
  });

  socket.on('disconnect', () => {
    console.error('❌ Disconnected from server');
    process.exit(1);
  });

  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
    process.exit(1);
  });
}

// Start the simulation
startSimulation().then(() => {
  setupErrorHandling();
});