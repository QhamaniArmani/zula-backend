import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

// Define PricingModel schema (since we might not have the model file yet)
const pricingSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    enum: ['standard', 'premium', 'luxury']
  },
  baseFare: { 
    type: Number, 
    required: true 
  },
  perKmRate: { 
    type: Number, 
    required: true 
  },
  perMinuteRate: { 
    type: Number, 
    required: true 
  },
  minimumFare: { 
    type: Number, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, {
  timestamps: true
});

const PricingModel = mongoose.model('PricingModel', pricingSchema);

const initPricing = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const pricingModels = [
      {
        name: 'standard',
        baseFare: 20,       // Balanced pricing
        perKmRate: 10,      // Balanced pricing  
        perMinuteRate: 1.7, // Balanced pricing
        minimumFare: 35,    // Balanced pricing
        isActive: true
      },
      {
        name: 'premium', 
        baseFare: 35,       // Balanced pricing
        perKmRate: 15,      // Balanced pricing
        perMinuteRate: 2.5, // Balanced pricing
        minimumFare: 65,    // Balanced pricing
        isActive: true
      },
      {
        name: 'luxury',
        baseFare: 55,       // Balanced pricing
        perKmRate: 22,      // Balanced pricing
        perMinuteRate: 4,   // Balanced pricing
        minimumFare: 100,   // Balanced pricing
        isActive: true
      }
    ];

    console.log('🚀 Initializing balanced pricing models...\n');

    for (const model of pricingModels) {
      const result = await PricingModel.findOneAndUpdate(
        { name: model.name },
        model,
        { upsert: true, new: true, runValidators: true }
      );
      console.log(`✅ ${model.name.toUpperCase()} pricing model:`);
      console.log(`   Base Fare: R${result.baseFare}`);
      console.log(`   Per Km: R${result.perKmRate}`);
      console.log(`   Per Minute: R${result.perMinuteRate}`);
      console.log(`   Minimum Fare: R${result.minimumFare}\n`);
    }

    console.log('🎉 ALL BALANCED PRICING MODELS INITIALIZED!');
    console.log('⚖️  Perfect balance: Riders save 10-15%, Drivers earn sustainably!');
    console.log('💰 Drivers keep 100% of fares → Better for everyone!');
    
    // Close connection and exit
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error initializing pricing models:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🔄 Closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
});

// Run the initialization
initPricing();