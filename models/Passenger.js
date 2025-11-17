import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const passengerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Passenger name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['passenger', 'admin'],
    default: 'passenger'
  },

  // 🆕 COMPREHENSIVE RATING FIELDS
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
      set: val => Math.round(val * 100) / 100 // Round to 2 decimal places
    },
    totalRatings: {
      type: Number,
      default: 0
    },
    ratingDistribution: {
      1: { type: Number, default: 0 },
      2: { type: Number, default: 0 },
      3: { type: Number, default: 0 },
      4: { type: Number, default: 0 },
      5: { type: Number, default: 0 }
    },
    categoryRatings: {
      punctuality: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 5
      },
      behavior: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 5
      },
      communication: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 5
      }
    },
    lastRatingUpdate: {
      type: Date,
      default: null
    }
  },

  // 🆕 RATING ANALYTICS
  ratingAnalytics: {
    responseRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    averageResponseTime: {
      type: Number, // in hours
      default: 0
    },
    ratingTrend: [{
      period: String, // e.g., '2024-01'
      average: Number,
      total: Number,
      _id: false
    }],
    lastAnalyticsUpdate: {
      type: Date,
      default: null
    }
  },

  // 🆕 PASSENGER-SPECIFIC FIELDS
  preferences: {
    favoriteDrivers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver'
    }],
    preferredVehicleType: {
      type: String,
      enum: ['standard', 'premium', 'luxury'],
      default: 'standard'
    },
    notificationPreferences: {
      rideUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false },
      ratingReminders: { type: Boolean, default: true }
    }
  },

  favoriteLocations: [{
    name: String,
    address: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0]
      }
    },
    type: {
      type: String,
      enum: ['home', 'work', 'favorite'],
      default: 'favorite'
    }
  }],

  // 🆕 PASSENGER STATISTICS
  stats: {
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
    totalSpent: {
      type: Number,
      default: 0
    },
    favoriteDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver'
    },
    lastRide: {
      type: Date,
      default: null
    }
  },

  paymentMethods: [{
    type: {
      type: String,
      enum: ['card', 'cash', 'mobile_money'],
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    // For card payments
    cardLastFour: String,
    cardBrand: String,
    // For mobile money
    provider: String,
    phoneNumber: String
  }],

  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  }

}, {
  timestamps: true
});

// 🆕 VIRTUAL FIELDS FOR RATING
passengerSchema.virtual('ratingPercentage').get(function() {
  if (this.rating.totalRatings === 0) return 0;
  return (this.rating.average / 5) * 100;
});

passengerSchema.virtual('ratingBadge').get(function() {
  if (this.rating.totalRatings === 0) return 'New Passenger';
  
  const avg = this.rating.average;
  const total = this.rating.totalRatings;
  
  if (avg >= 4.8 && total >= 20) return 'Elite Passenger';
  if (avg >= 4.8 && total >= 5) return 'Excellent Passenger';
  if (avg >= 4.5) return 'Great Passenger';
  if (avg >= 4.0) return 'Good Passenger';
  return 'Rated Passenger';
});

passengerSchema.virtual('isHighlyRated').get(function() {
  return this.rating.average >= 4.0 && this.rating.totalRatings >= 3;
});

passengerSchema.virtual('hasSufficientRatings').get(function() {
  return this.rating.totalRatings >= 2;
});

// 🆕 INSTANCE METHODS FOR RATING
passengerSchema.methods.getRatingBadge = function() {
  return this.ratingBadge;
};

passengerSchema.methods.calculateResponseRate = async function() {
  try {
    const Rating = mongoose.model('Rating');
    
    const totalRatings = await Rating.countDocuments({
      'ratedUser.userId': this._id,
      'ratedUser.userModel': 'Passenger'
    });
    
    const ratingsWithResponse = await Rating.countDocuments({
      'ratedUser.userId': this._id,
      'ratedUser.userModel': 'Passenger',
      'response.respondedAt': { $exists: true, $ne: null }
    });
    
    const responseRate = totalRatings > 0 ? (ratingsWithResponse / totalRatings) * 100 : 0;
    
    this.ratingAnalytics.responseRate = Math.round(responseRate);
    await this.save();
    
    return responseRate;
  } catch (error) {
    console.error('Error calculating response rate:', error);
    return 0;
  }
};

passengerSchema.methods.addFavoriteDriver = function(driverId) {
  if (!this.preferences.favoriteDrivers.includes(driverId)) {
    this.preferences.favoriteDrivers.push(driverId);
  }
  return this.save();
};

passengerSchema.methods.removeFavoriteDriver = function(driverId) {
  this.preferences.favoriteDrivers = this.preferences.favoriteDrivers.filter(
    id => id.toString() !== driverId.toString()
  );
  return this.save();
};

// 🆕 STATIC METHODS FOR RATING
passengerSchema.statics.updateRatingStats = async function(passengerId, newStats) {
  return this.findByIdAndUpdate(
    passengerId,
    {
      $set: {
        'rating.average': newStats.averageRating,
        'rating.totalRatings': newStats.totalRatings,
        'rating.ratingDistribution': newStats.ratingDistribution,
        'rating.categoryRatings': newStats.categoryRatings,
        'rating.lastRatingUpdate': new Date()
      }
    },
    { new: true }
  );
};

passengerSchema.statics.getHighlyRatedPassengers = function(limit = 10, minRatings = 3) {
  return this.find({
    'rating.totalRatings': { $gte: minRatings },
    'rating.average': { $gte: 4.0 }
  })
  .sort({ 'rating.average': -1, 'rating.totalRatings': -1 })
  .limit(limit)
  .select('name rating stats.preferences');
};

// Password hashing middleware
passengerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password
passengerSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if password changed after token was issued
passengerSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Indexes
passengerSchema.index({ email: 1 });
passengerSchema.index({ status: 1 });
passengerSchema.index({ 'favoriteLocations.coordinates': '2dsphere' });
passengerSchema.index({ 'rating.average': -1 });
passengerSchema.index({ 'rating.totalRatings': -1 });
passengerSchema.index({ 'stats.totalRides': -1 });

// Ensure virtual fields are serialized
passengerSchema.set('toJSON', { virtuals: true });
passengerSchema.set('toObject', { virtuals: true });

export default mongoose.model('Passenger', passengerSchema);