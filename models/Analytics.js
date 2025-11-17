import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  // Daily ride analytics
  date: {
    type: Date,
    required: true,
    unique: true
  },
  
  // Ride statistics
  totalRides: {
    type: Number,
    default: 0
  },
  completedRides: {
    type: Number,
    default: 0
  },
  cancelledRides: {
    type: Number,
    default: 0
  },
  
  // Revenue analytics
  totalRevenue: {
    type: Number,
    default: 0
  },
  averageFare: {
    type: Number,
    default: 0
  },
  cancellationFees: {
    type: Number,
    default: 0
  },
  
  // Driver analytics
  activeDrivers: {
    type: Number,
    default: 0
  },
  driverEarnings: {
    type: Number,
    default: 0
  },
  averageDriverRating: {
    type: Number,
    default: 0
  },
  
  // Passenger analytics
  activePassengers: {
    type: Number,
    default: 0
  },
  newPassengers: {
    type: Number,
    default: 0
  },
  averagePassengerRating: {
    type: Number,
    default: 0
  },
  
  // Performance metrics
  averageWaitTime: {
    type: Number, // in minutes
    default: 0
  },
  averageTripDistance: {
    type: Number, // in km
    default: 0
  },
  averageTripDuration: {
    type: Number, // in minutes
    default: 0
  },
  
  // Vehicle type breakdown
  vehicleTypeBreakdown: {
    standard: { type: Number, default: 0 },
    premium: { type: Number, default: 0 },
    luxury: { type: Number, default: 0 }
  },
  
  // Payment method breakdown
  paymentMethodBreakdown: {
    wallet: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
    cash: { type: Number, default: 0 },
    mobile_money: { type: Number, default: 0 }
  },
  
  // Peak hours analysis
  peakHours: [{
    hour: Number,
    rideCount: Number,
    averageFare: Number
  }],
  
  // Geographical data
  popularRoutes: [{
    pickupArea: String,
    destinationArea: String,
    rideCount: Number,
    averageDistance: Number
  }],
  
  // Customer satisfaction
  ratingDistribution: {
    '1': { type: Number, default: 0 },
    '2': { type: Number, default: 0 },
    '3': { type: Number, default: 0 },
    '4': { type: Number, default: 0 },
    '5': { type: Number, default: 0 }
  },
  
  // Cancellation analysis
  cancellationReasons: {
    passenger: {
      'change_of_plans': { type: Number, default: 0 },
      'driver_too_far': { type: Number, default: 0 },
      'price_too_high': { type: Number, default: 0 },
      'other': { type: Number, default: 0 }
    },
    driver: {
      'passenger_not_ready': { type: Number, default: 0 },
      'vehicle_issue': { type: Number, default: 0 },
      'traffic_too_heavy': { type: Number, default: 0 },
      'other': { type: Number, default: 0 }
    }
  },
  
  // Platform metrics
  platformCommission: {
    type: Number,
    default: 0
  },
  netRevenue: {
    type: Number,
    default: 0
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Summary for quick access
  summary: {
    totalRidesToday: Number,
    revenueToday: Number,
    activeUsersToday: Number,
    cancellationRate: Number,
    averageRatingToday: Number
  }
}, {
  timestamps: true
});

// Index for date-based queries
analyticsSchema.index({ date: 1 });
analyticsSchema.index({ createdAt: 1 });

// Static method to get analytics for a date range
analyticsSchema.statics.getDateRangeAnalytics = async function(startDate, endDate) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: 1 });
};

// Static method to get latest analytics
analyticsSchema.statics.getLatestAnalytics = async function(days = 7) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.getDateRangeAnalytics(startDate, endDate);
};

// Instance method to update summary
analyticsSchema.methods.updateSummary = function() {
  const totalRides = this.completedRides + this.cancelledRides;
  const cancellationRate = totalRides > 0 ? (this.cancelledRides / totalRides) * 100 : 0;
  
  this.summary = {
    totalRidesToday: this.totalRides,
    revenueToday: this.totalRevenue,
    activeUsersToday: this.activeDrivers + this.activePassengers,
    cancellationRate: parseFloat(cancellationRate.toFixed(2)),
    averageRatingToday: parseFloat(((this.averageDriverRating + this.averagePassengerRating) / 2).toFixed(2))
  };
  
  return this.save();
};

export default mongoose.model('Analytics', analyticsSchema);