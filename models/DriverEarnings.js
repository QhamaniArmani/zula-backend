import mongoose from 'mongoose';

const driverEarningsSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'daily'
  },
  
  // Earnings breakdown
  earnings: {
    total: { type: Number, default: 0 },
    fromRides: { type: Number, default: 0 },
    tips: { type: Number, default: 0 },
    bonuses: { type: Number, default: 0 }
  },
  
  // Ride metrics
  rides: {
    completed: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
    totalDistance: { type: Number, default: 0 }, // km
    totalDuration: { type: Number, default: 0 }, // minutes
    averageRating: { type: Number, default: 0 }
  },
  
  // Time metrics
  onlineHours: { type: Number, default: 0 },
  activeHours: { type: Number, default: 0 },
  
  // Performance metrics
  acceptanceRate: { type: Number, default: 0 }, // percentage
  completionRate: { type: Number, default: 0 } // percentage
}, {
  timestamps: true
});

// Compound index for efficient queries
driverEarningsSchema.index({ driverId: 1, date: 1 });
driverEarningsSchema.index({ date: 1, period: 1 });

export default mongoose.model('DriverEarnings', driverEarningsSchema);