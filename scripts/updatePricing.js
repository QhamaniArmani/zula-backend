import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const updatePricing = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Update standard pricing to be more competitive
    const updates = [
      {
        name: 'standard',
        updates: {
          baseFare: 18,      // Reduced from 20
          minimumFare: 30    // Reduced from 35
        }
      },
      {
        name: 'premium', 
        updates: {
          baseFare: 30,      // Reduced from 35
          minimumFare: 55    // Reduced from 65
        }
      },
      {
        name: 'luxury',
        updates: {
          baseFare: 45,      // Reduced from 55
          minimumFare: 80    // Reduced from 100
        }
      }
    ];

    console.log('🚀 Updating pricing models for better competitiveness...\n');

    for (const update of updates) {
      const result = await mongoose.connection.collection('pricingmodels').updateOne(
        { name: update.name },
        { $set: update.updates }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ ${update.name.toUpperCase()} pricing updated:`);
        console.log(`   Base Fare: R${update.updates.baseFare}`);
        console.log(`   Minimum Fare: R${update.updates.minimumFare}\n`);
      } else {
        console.log(`⚠️  ${update.name} pricing not found or already updated\n`);
      }
    }

    console.log('🎉 PRICING MODELS UPDATED SUCCESSFULLY!');
    console.log('💰 Now more competitive with Uber/Bolt');
    console.log('🚗 Drivers still keep 100% of fares!');
    
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error updating pricing models:', error);
    process.exit(1);
  }
};

updatePricing();