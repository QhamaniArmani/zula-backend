import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Passenger from '../models/Passenger.js';
import dotenv from 'dotenv';

dotenv.config();

const initPassengers = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const passengers = [
      {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+27761234567',
        profilePhoto: null,
        favoriteLocations: [
          {
            name: 'Home',
            address: '123 Main Street, Johannesburg',
            coordinates: {
              latitude: -26.2041,
              longitude: 28.0473
            },
            type: 'home'
          },
          {
            name: 'Work',
            address: '456 Business District, Sandton',
            coordinates: {
              latitude: -26.1076,
              longitude: 28.0567
            },
            type: 'work'
          }
        ],
        emergencyContact: {
          name: 'Jane Doe',
          phone: '+27769876543',
          relationship: 'Spouse'
        }
      },
      {
        name: 'Sarah Smith',
        email: 'sarah@example.com',
        phone: '+27761122334',
        profilePhoto: null,
        favoriteLocations: [
          {
            name: 'Apartment',
            address: '789 Rosebank, Johannesburg',
            coordinates: {
              latitude: -26.1458,
              longitude: 28.0436
            },
            type: 'home'
          }
        ],
        emergencyContact: {
          name: 'Mike Smith',
          phone: '+27765544332',
          relationship: 'Brother'
        }
      }
    ];

    console.log('🚀 Creating initial passengers...\n');

    for (const passengerData of passengers) {
      const existingPassenger = await Passenger.findOne({ email: passengerData.email });
      
      if (!existingPassenger) {
        const passenger = new Passenger(passengerData);
        await passenger.save();
        console.log(`✅ Passenger created: ${passenger.name} (${passenger.email})`);
      } else {
        console.log(`⚠️ Passenger already exists: ${passengerData.name}`);
      }
    }

    console.log('\n🎉 PASSENGER INITIALIZATION COMPLETE!');
    console.log('👥 Passenger management system ready!');
    
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error initializing passengers:', error);
    process.exit(1);
  }
};

initPassengers();