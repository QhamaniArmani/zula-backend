// tests/rideLifecycleTest.js
import { io } from 'socket.io-client';

const socket = io('http://localhost:5001');

// Test data
const PASSENGER_ID = 'passenger_test_123';
const DRIVER_ID = 'driver_test_456';
let currentRideId = null;

console.log('🚗 Starting Ride Lifecycle Test...\n');

socket.on('connect', () => {
  console.log('✅ Connected to server');
  
  // Join as passenger and driver
  socket.emit('passenger:join', PASSENGER_ID);
  socket.emit('driver:join', DRIVER_ID);
  
  startTest();
});

// Test sequence
function startTest() {
  console.log('1. 📱 Passenger requesting ride...');
  
  socket.emit('ride:request', {
    passengerId: PASSENGER_ID,
    pickup: {
      address: "123 Main St, Johannesburg",
      coordinates: { latitude: -26.2041, longitude: 28.0473 }
    },
    destination: {
      address: "456 Sandton City, Sandton", 
      coordinates: { latitude: -26.1076, longitude: 28.0567 }
    },
    vehicleType: 'standard'
  });
}

// Listen for ride requested
socket.on('ride:requested', (data) => {
  console.log('✅ Ride requested successfully:', data.ride._id);
  currentRideId = data.ride._id;
  
  // Wait 2 seconds then accept the ride
  setTimeout(() => {
    console.log('\n2. 🚖 Driver accepting ride...');
    socket.emit('ride:accept', {
      rideId: currentRideId,
      driverId: DRIVER_ID
    });
  }, 2000);
});

// Listen for ride accepted
socket.on('ride:accepted', (data) => {
  console.log('✅ Ride accepted by driver');
  
  // Wait 2 seconds then start the ride
  setTimeout(() => {
    console.log('\n3. 🚦 Driver starting ride...');
    socket.emit('ride:start', {
      rideId: currentRideId
    });
  }, 2000);
});

// Listen for ride started
socket.on('ride:started', (data) => {
  console.log('✅ Ride started');
  
  // Simulate ride progress with location updates
  console.log('\n4. 📍 Simulating ride progress...');
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress += 20;
    console.log(`   Ride progress: ${progress}%`);
    
    socket.emit('ride:location_update', {
      rideId: currentRideId,
      driverId: DRIVER_ID,
      passengerId: PASSENGER_ID,
      location: {
        latitude: -26.2041 + (progress / 100 * 0.0975),
        longitude: 28.0473 + (progress / 100 * 0.0094)
      },
      heading: 45,
      speed: 60
    });
    
    if (progress >= 100) {
      clearInterval(progressInterval);
      
      // Complete the ride
      setTimeout(() => {
        console.log('\n5. 🏁 Driver completing ride...');
        socket.emit('ride:complete', {
          rideId: currentRideId,
          actualDistance: 12.3,
          actualDuration: 18
        });
      }, 1000);
    }
  }, 500);
});

// Listen for ride completed
socket.on('ride:completed', (data) => {
  console.log('✅ Ride completed successfully!');
  console.log('💰 Fare:', data.ride.pricing.totalFare, data.ride.pricing.currency);
  console.log('📊 Distance:', data.ride.actualDistance, 'km');
  console.log('⏱️ Duration:', data.ride.actualDuration, 'minutes');
  console.log('🎫 Status:', data.ride.status);
  console.log('⭐ Can be rated until:', data.ride.ratingStatus.canBeRatedUntil);
  
  console.log('\n🎉 Ride lifecycle test completed!');
  process.exit(0);
});

// Error handling
socket.on('ride:request_failed', (data) => {
  console.error('❌ Ride request failed:', data.message);
});

socket.on('ride:accept_failed', (data) => {
  console.error('❌ Ride acceptance failed:', data.message);
});

socket.on('ride:start_failed', (data) => {
  console.error('❌ Ride start failed:', data.message);
});

socket.on('ride:complete_failed', (data) => {
  console.error('❌ Ride completion failed:', data.message);
});

// Listen for passenger-specific notifications
socket.on(`passenger:${PASSENGER_ID}:ride_accepted`, (data) => {
  console.log('📱 Passenger notified: Driver accepted ride');
});

socket.on(`passenger:${PASSENGER_ID}:ride_started`, (data) => {
  console.log('📱 Passenger notified: Ride started');
});

socket.on(`passenger:${PASSENGER_ID}:ride_completed`, (data) => {
  console.log('📱 Passenger notified: Ride completed');
});

socket.on('disconnect', () => {
  console.log('🔌 Disconnected from server');
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});