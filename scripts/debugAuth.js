import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Driver from '../models/Driver.js';
import dotenv from 'dotenv';

dotenv.config();

const debugAuth = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await connectDB();
    
    // Test creating a driver with auth
    const testDriver = new Driver({
      name: 'Debug Driver',
      email: 'debugdriver@example.com',
      phone: '+27760000000',
      password: 'debug123',
      licensePlate: 'DEBUG123',
      vehicleType: 'Sedan'
    });
    
    console.log('✅ Test driver created in memory');
    console.log('📋 Driver fields:', Object.keys(testDriver.toObject()));
    console.log('🔑 Password field exists:', 'password' in testDriver);
    console.log('🛠️ correctPassword method exists:', typeof testDriver.correctPassword);
    console.log('📝 Method type:', typeof testDriver.correctPassword);
    
    // Test saving
    await testDriver.save();
    console.log('💾 Test driver saved to database');
    
    // Test finding and method
    const foundDriver = await Driver.findOne({ email: 'debugdriver@example.com' }).select('+password');
    console.log('🔍 Found driver:', !!foundDriver);
    console.log('🛠️ Found driver method exists:', foundDriver ? typeof foundDriver.correctPassword : 'N/A');
    
    if (foundDriver) {
      const isCorrect = await foundDriver.correctPassword('debug123');
      console.log('✅ Password check works:', isCorrect);
    }
    
    // Clean up
    await Driver.deleteOne({ email: 'debugdriver@example.com' });
    console.log('🧹 Test driver cleaned up');
    
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    process.exit(1);
  }
};

debugAuth();