import mongoose from 'mongoose';
import Passenger from '../models/Passenger.js';
import Driver from '../models/Driver.js';
import Ride from '../models/Ride.js';
import Wallet from '../models/Wallet.js';

const TEST_DB_URI = 'mongodb://localhost:27017/zula_test';

export const setupTestData = async () => {
  try {
    // Connect to test database
    await mongoose.connect(TEST_DB_URI);
    console.log('✅ Connected to test database');

    // Clear existing test data
    await Passenger.deleteMany({ email: /test/ });
    await Driver.deleteMany({ email: /test/ });
    await Ride.deleteMany({});
    await Wallet.deleteMany({});
    console.log('✅ Cleared existing test data');

    // Create test passenger
    const passenger = new Passenger({
      name: 'Test Passenger',
      email: 'test.passenger@zula.com',
      phone: '+1234567890',
      password: 'hashedpassword123'
    });
    await passenger.save();
    console.log('✅ Created test passenger:', passenger._id);

    // Create test driver
    const driver = new Driver({
      name: 'Test Driver',
      email: 'test.driver@zula.com',
      phone: '+1234567891',
      password: 'hashedpassword123',
      vehicle: {
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        color: 'White',
        licensePlate: 'TEST123'
      },
      location: {
        latitude: -1.9399,
        longitude: 30.0588
      },
      isAvailable: true
    });
    await driver.save();
    console.log('✅ Created test driver:', driver._id);

    // Create wallet for passenger
    const wallet = new Wallet({
      userId: passenger._id,
      balance: 1000, // Starting with 1000 for testing
      currency: 'ZAR',
      transactions: []
    });
    await wallet.save();
    console.log('✅ Created test wallet with balance:', wallet.balance);

    console.log('🎉 Test data setup completed!');
    
    return {
      passengerId: passenger._id,
      driverId: driver._id,
      walletId: wallet._id
    };

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    throw error;
  }
};