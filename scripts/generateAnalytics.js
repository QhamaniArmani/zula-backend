import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import analyticsService from '../services/analyticsService.js';
import Driver from '../models/Driver.js';
import dotenv from 'dotenv';

dotenv.config();

const generateAnalytics = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await connectDB();
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    console.log(`📊 Generating analytics for ${yesterday.toDateString()}...`);
    
    // Generate platform analytics
    await analyticsService.generateDailyAnalytics(yesterday);
    
    // Generate earnings for all active drivers
    const activeDrivers = await Driver.find({
      lastActive: { 
        $gte: new Date(yesterday.setHours(0, 0, 0, 0)),
        $lte: new Date(yesterday.setHours(23, 59, 59, 999))
      }
    });
    
    console.log(`👥 Generating earnings for ${activeDrivers.length} active drivers...`);
    
    for (const driver of activeDrivers) {
      await analyticsService.generateDriverEarnings(driver._id, yesterday);
    }
    
    console.log('✅ Analytics generation completed successfully!');
    
    await mongoose.connection.close();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error generating analytics:', error);
    process.exit(1);
  }
};

generateAnalytics();