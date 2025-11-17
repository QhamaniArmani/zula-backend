import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Driver name is required'],
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
    enum: ['driver', 'admin'],
    default: 'driver'
  },

  // 🆕 SUBSCRIPTION-RELATED FIELDS
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'cancelled', 'trial'],
    default: 'inactive'
  },
  currentSubscription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DriverSubscription'
  },
  subscriptionHistory: [{
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DriverSubscription'
    },
    startDate: Date,
    endDate: Date,
    status: String
  }],
  hasActiveSubscription: {
    type: Boolean,
    default: false
  },
  subscriptionExpiry: {
    type: Date,
    default: null
  },
  trialRidesRemaining: {
    type: Number,
    default: 0
  },

  // 🆕 FCM TOKEN FIELDS FOR PUSH NOTIFICATIONS
  fcmToken: {
    type: String,
    default: null
  },
  fcmTokenUpdatedAt: {
    type: Date,
    default: null
  },
  notificationTokens: [{
    token: String,
    deviceType: {
      type: String,
      enum: ['android', 'ios', 'web'],
      default: 'android'
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  notificationPreferences: {
    rideRequests: { type: Boolean, default: true },
    rideUpdates: { type: Boolean, default: true },
    earnings: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true },
    system: { type: Boolean, default: true },
    subscription: { type: Boolean, default: true } // 🆕 ADD SUBSCRIPTION NOTIFICATIONS
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
      cleanliness: { 
        type: Number, 
        default: 0,
        min: 0,
        max: 5
      },
      driving: { 
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
      },
      behavior: { 
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

  // 🆕 RATING BADGES AND ACHIEVEMENTS
  badges: [{
    type: String,
    enum: [
      'top_rated',
      'excellent_service', 
      'great_communication',
      'punctual_driver',
      'clean_vehicle',
      'safe_driver',
      'friendly_driver',
      'new_driver',
      'veteran_driver',
      'subscribed_driver' // 🆕 ADD SUBSCRIPTION BADGE
    ]
  }],

  // 🆕 RATING-RELATED STATISTICS
  stats: {
    completedRides: {
      type: Number,
      default: 0
    },
    cancelledRides: {
      type: Number,
      default: 0
    },
    acceptanceRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    onlineHours: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: null
    },
    subscriptionRides: { // 🆕 ADD SUBSCRIPTION RIDE COUNT
      type: Number,
      default: 0
    },
    trialRidesCompleted: { // 🆕 ADD TRIAL RIDE COUNT
      type: Number,
      default: 0
    }
  },

  // ... rest of your existing driver fields (vehicle, location, etc.) ...
  vehicle: {
    make: String,
    model: String,
    year: Number,
    color: String,
    licensePlate: String,
    vehicleType: {
      type: String,
      enum: ['standard', 'premium', 'luxury'],
      default: 'standard'
    }
  },
  
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    },
    address: String,
    lastUpdated: Date
  },
  
  isAvailable: {
    type: Boolean,
    default: false
  },
  
  isVerified: {
    type: Boolean,
    default: false
  },
  
  availabilityStatus: {
    type: String,
    enum: ['online', 'offline', 'busy'],
    default: 'offline'
  }

}, {
  timestamps: true
});

// 🆕 VIRTUAL FIELDS FOR SUBSCRIPTIONS
driverSchema.virtual('canAcceptRides').get(function() {
  return this.hasActiveSubscription && 
         this.subscriptionStatus === 'active' && 
         this.isAvailable;
});

driverSchema.virtual('isOnTrial').get(function() {
  return this.subscriptionStatus === 'trial' && this.trialRidesRemaining > 0;
});

driverSchema.virtual('subscriptionExpired').get(function() {
  return this.subscriptionExpiry && new Date() > this.subscriptionExpiry;
});

// 🆕 VIRTUAL FIELDS FOR NOTIFICATIONS
driverSchema.virtual('canReceiveRideRequestNotifications').get(function() {
  return this.fcmToken && 
         this.notificationPreferences.rideRequests && 
         this.isAvailable && 
         this.availabilityStatus === 'online' &&
         this.canAcceptRides; // 🆕 ADD SUBSCRIPTION CHECK
});

driverSchema.virtual('hasActiveNotificationToken').get(function() {
  return this.fcmToken || this.notificationTokens.some(token => token.isActive);
});

// 🆕 VIRTUAL FIELDS FOR RATING
driverSchema.virtual('ratingPercentage').get(function() {
  if (this.rating.totalRatings === 0) return 0;
  return (this.rating.average / 5) * 100;
});

driverSchema.virtual('ratingBadge').get(function() {
  if (this.rating.totalRatings === 0) return 'New Driver';
  
  const avg = this.rating.average;
  const total = this.rating.totalRatings;
  
  if (avg >= 4.8 && total >= 50) return 'Elite Driver';
  if (avg >= 4.8 && total >= 10) return 'Top Rated';
  if (avg >= 4.5 && total >= 5) return 'Excellent';
  if (avg >= 4.0) return 'Great';
  if (avg >= 3.5) return 'Good';
  return 'Rated';
});

driverSchema.virtual('isTopRated').get(function() {
  return this.rating.average >= 4.5 && this.rating.totalRatings >= 5;
});

driverSchema.virtual('hasSufficientRatings').get(function() {
  return this.rating.totalRatings >= 3;
});

// 🆕 INSTANCE METHODS FOR SUBSCRIPTIONS
driverSchema.methods.updateSubscriptionStatus = function(status, subscriptionId = null) {
  this.subscriptionStatus = status;
  this.hasActiveSubscription = status === 'active' || status === 'trial';
  
  if (subscriptionId) {
    this.currentSubscription = subscriptionId;
  }
  
  // Add subscription badge if active
  if (this.hasActiveSubscription && !this.badges.includes('subscribed_driver')) {
    this.badges.push('subscribed_driver');
  }
  
  return this.save();
};

driverSchema.methods.decrementTrialRides = function() {
  if (this.isOnTrial && this.trialRidesRemaining > 0) {
    this.trialRidesRemaining -= 1;
    this.stats.trialRidesCompleted += 1;
    
    // Check if trial is exhausted
    if (this.trialRidesRemaining === 0) {
      this.subscriptionStatus = 'inactive';
      this.hasActiveSubscription = false;
    }
    
    return this.save();
  }
  return Promise.resolve(this);
};

driverSchema.methods.canAcceptRide = function() {
  if (this.isOnTrial) {
    return this.trialRidesRemaining > 0;
  }
  return this.hasActiveSubscription && !this.subscriptionExpired;
};

// 🆕 INSTANCE METHODS FOR NOTIFICATIONS
driverSchema.methods.updateFCMToken = function(token, deviceType = 'android') {
  this.fcmToken = token;
  this.fcmTokenUpdatedAt = new Date();
  
  // Add to notification tokens array for multiple device support
  if (token) {
    const existingTokenIndex = this.notificationTokens.findIndex(
      t => t.token === token && t.deviceType === deviceType
    );
    
    if (existingTokenIndex === -1) {
      this.notificationTokens.push({
        token: token,
        deviceType: deviceType,
        isActive: true
      });
    } else {
      this.notificationTokens[existingTokenIndex].isActive = true;
      this.notificationTokens[existingTokenIndex].createdAt = new Date();
    }
  }
  
  return this.save();
};

driverSchema.methods.removeFCMToken = function(token = null) {
  if (token) {
    // Remove specific token
    const tokenIndex = this.notificationTokens.findIndex(t => t.token === token);
    if (tokenIndex !== -1) {
      this.notificationTokens[tokenIndex].isActive = false;
    }
    
    if (this.fcmToken === token) {
      this.fcmToken = null;
      this.fcmTokenUpdatedAt = new Date();
    }
  } else {
    // Remove all tokens
    this.fcmToken = null;
    this.fcmTokenUpdatedAt = new Date();
    this.notificationTokens.forEach(token => {
      token.isActive = false;
    });
  }
  
  return this.save();
};

driverSchema.methods.getActiveNotificationTokens = function() {
  const activeTokens = this.notificationTokens
    .filter(token => token.isActive)
    .map(token => token.token);
  
  // Include the main fcmToken if it exists and is not in the array
  if (this.fcmToken && !activeTokens.includes(this.fcmToken)) {
    activeTokens.push(this.fcmToken);
  }
  
  return activeTokens;
};

driverSchema.methods.canReceiveNotificationType = function(notificationType) {
  const preferenceMap = {
    'ride_request': 'rideRequests',
    'ride_update': 'rideUpdates',
    'earnings': 'earnings',
    'promotion': 'promotions',
    'system': 'system',
    'subscription': 'subscription' // 🆕 ADD SUBSCRIPTION NOTIFICATIONS
  };
  
  const preference = preferenceMap[notificationType];
  return preference ? this.notificationPreferences[preference] : true;
};

// 🆕 INSTANCE METHODS FOR RATING
driverSchema.methods.getRatingBadge = function() {
  return this.ratingBadge;
};

driverSchema.methods.calculateResponseRate = async function() {
  try {
    const Rating = mongoose.model('Rating');
    
    const totalRatings = await Rating.countDocuments({
      'ratedUser.userId': this._id,
      'ratedUser.userModel': 'Driver'
    });
    
    const ratingsWithResponse = await Rating.countDocuments({
      'ratedUser.userId': this._id,
      'ratedUser.userModel': 'Driver',
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

driverSchema.methods.updateRatingBadges = function() {
  const badges = [];
  const avg = this.rating.average;
  const total = this.rating.totalRatings;
  
  // Clear existing badges (except subscription badge)
  const subscriptionBadge = this.badges.includes('subscribed_driver') ? ['subscribed_driver'] : [];
  this.badges = [...subscriptionBadge];
  
  // Add badges based on performance
  if (total === 0) {
    badges.push('new_driver');
  } else {
    if (avg >= 4.8 && total >= 10) badges.push('top_rated');
    if (avg >= 4.5) badges.push('excellent_service');
    if (this.rating.categoryRatings.communication >= 4.5) badges.push('great_communication');
    if (this.rating.categoryRatings.punctuality >= 4.5) badges.push('punctual_driver');
    if (this.rating.categoryRatings.cleanliness >= 4.5) badges.push('clean_vehicle');
    if (this.rating.categoryRatings.driving >= 4.5) badges.push('safe_driver');
    if (this.rating.categoryRatings.behavior >= 4.5) badges.push('friendly_driver');
    if (total >= 100) badges.push('veteran_driver');
  }
  
  this.badges = [...this.badges, ...badges];
  return this.save();
};

// 🆕 STATIC METHODS FOR SUBSCRIPTIONS
driverSchema.statics.findDriversWithActiveSubscriptions = function(conditions = {}) {
  const query = {
    ...conditions,
    hasActiveSubscription: true,
    subscriptionStatus: { $in: ['active', 'trial'] },
    isAvailable: true,
    availabilityStatus: 'online'
  };
  
  return this.find(query);
};

driverSchema.statics.getAvailableSubscribedDrivers = function() {
  return this.find({
    hasActiveSubscription: true,
    subscriptionStatus: { $in: ['active', 'trial'] },
    isAvailable: true,
    availabilityStatus: 'online'
  });
};

// 🆕 STATIC METHODS FOR NOTIFICATIONS
driverSchema.statics.findDriversWithFCMTokens = function(conditions = {}) {
  const query = {
    ...conditions,
    fcmToken: { $ne: null, $exists: true },
    'notificationPreferences.rideRequests': true,
    isAvailable: true,
    availabilityStatus: 'online',
    hasActiveSubscription: true // 🆕 ADD SUBSCRIPTION REQUIREMENT
  };
  
  return this.find(query);
};

driverSchema.statics.getAvailableDriversWithTokens = function() {
  return this.find({
    isAvailable: true,
    availabilityStatus: 'online',
    fcmToken: { $ne: null, $exists: true },
    'notificationPreferences.rideRequests': true,
    hasActiveSubscription: true // 🆕 ADD SUBSCRIPTION REQUIREMENT
  });
};

// 🆕 STATIC METHODS FOR RATING
driverSchema.statics.updateRatingStats = async function(driverId, newStats) {
  return this.findByIdAndUpdate(
    driverId,
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

driverSchema.statics.getTopRatedDrivers = function(limit = 10, minRatings = 5) {
  return this.find({
    'rating.totalRatings': { $gte: minRatings },
    'rating.average': { $gte: 4.0 },
    hasActiveSubscription: true // 🆕 ONLY RETURN SUBSCRIBED DRIVERS
  })
  .sort({ 'rating.average': -1, 'rating.totalRatings': -1 })
  .limit(limit)
  .select('name rating vehicle location isAvailable fcmToken notificationPreferences subscriptionStatus');
};

// Password hashing middleware
driverSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Instance method to check password
driverSchema.methods.correctPassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to check if password changed after token was issued
driverSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// 🆕 UPDATE FCM TOKEN AND RATING BADGES WHEN DRIVER IS SAVED
driverSchema.pre('save', function(next) {
  if (this.isModified('fcmToken') && this.fcmToken) {
    this.fcmTokenUpdatedAt = new Date();
  }
  
  if (this.isModified('rating')) {
    this.updateRatingBadges().catch(console.error);
  }

  // 🆕 UPDATE HAS_ACTIVE_SUBSCRIPTION BASED ON STATUS
  if (this.isModified('subscriptionStatus')) {
    this.hasActiveSubscription = this.subscriptionStatus === 'active' || this.subscriptionStatus === 'trial';
  }
  
  next();
});

// Create geospatial index
driverSchema.index({ location: '2dsphere' });
driverSchema.index({ 'rating.average': -1 });
driverSchema.index({ 'rating.totalRatings': -1 });
driverSchema.index({ badges: 1 });
driverSchema.index({ fcmToken: 1 }); // 🆕 Index for FCM token queries
driverSchema.index({ isAvailable: 1, availabilityStatus: 1 }); // 🆕 Index for driver availability
driverSchema.index({ hasActiveSubscription: 1 }); // 🆕 Index for subscription status
driverSchema.index({ subscriptionStatus: 1 }); // 🆕 Index for subscription status

// Ensure virtual fields are serialized
driverSchema.set('toJSON', { virtuals: true });
driverSchema.set('toObject', { virtuals: true });

export default mongoose.model('Driver', driverSchema);