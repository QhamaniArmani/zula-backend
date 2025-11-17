import mongoose from 'mongoose';

const rideSchema = new mongoose.Schema({
  // Basic ride information
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Passenger',
    required: true,
    index: true // Add index for faster history queries
  },
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    index: true // Add index for faster history queries
  },
  
  // Location information
  pickup: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    timestamp: Date
  },
  destination: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    timestamp: Date
  },
  
  // Ride details
  vehicleType: {
    type: String,
    enum: ['standard', 'premium', 'luxury'],
    default: 'standard'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'driver_en_route', 'arrived', 'in_progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true // Add index for status-based filtering
  },
  
  // Pricing information
  pricing: {
    baseFare: Number,
    distance: Number, // in km
    distanceFare: Number,
    time: Number, // in minutes
    timeFare: Number,
    surgeMultiplier: {
      type: Number,
      default: 1.0
    },
    timeMultiplier: Number,
    totalFare: Number,
    currency: {
      type: String,
      default: 'ZAR'
    },
    breakdown: {
      base: Number,
      distance: Number,
      time: Number,
      surge: Number,
      timeBased: Number
    }
  },
  
  // 🆕 COMPREHENSIVE PAYMENT INFORMATION
  payment: {
    method: {
      type: String,
      enum: ['wallet', 'card', 'cash', 'mobile_money', 'none'],
      default: 'none'
    },
    status: {
      type: String,
      enum: ['pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending'
    },
    amount: {
      type: Number,
      min: 0,
      default: 0
    },
    currency: {
      type: String,
      default: 'ZAR'
    },
    
    // Payment gateway details
    gateway: {
      name: String, // 'stripe', 'paystack', 'flutterwave', etc.
      transactionId: String,
      paymentIntentId: String,
      customerId: String,
      paymentMethodId: String
    },
    
    // Wallet transaction details
    walletTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet.transactions'
    },
    
    // Timestamps
    authorizedAt: Date,
    paidAt: Date,
    failedAt: Date,
    refundedAt: Date,
    
    // Failure/refund details
    failureReason: String,
    refundReason: String,
    refundAmount: {
      type: Number,
      default: 0
    },
    
    // Receipt information
    receiptNumber: String,
    invoiceUrl: String,
    
    // Security and verification
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedAt: Date,
    verificationMethod: String // 'auto', 'manual', '3d_secure'
  },
  
  // 🆕 ENHANCED CANCELLATION FIELDS (Updated with payment integration)
  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['driver', 'passenger', 'system', 'admin'],
      default: null
    },
    cancelledAt: {
      type: Date,
      default: null
    },
    cancellationReason: {
      type: String,
      maxlength: 500
    },
    cancellationFee: {
      type: Number,
      default: 0
    },
    refundAmount: {
      type: Number,
      default: 0
    },
    isRefundProcessed: {
      type: Boolean,
      default: false
    },
    refundProcessedAt: {
      type: Date,
      default: null
    },
    refundTransactionId: {
      type: String,
      default: null
    },
    penaltyApplied: {
      type: Boolean,
      default: false
    },
    penaltyAmount: {
      type: Number,
      default: 0
    },
    policyVersion: {
      type: String,
      default: '1.0'
    },
    
    // 🆕 Payment-specific cancellation fields
    paymentRefundStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    refundGatewayTransactionId: String
  },
  
  // 🆕 RATING STATUS FIELDS
  ratingStatus: {
    driverRated: {
      type: Boolean,
      default: false
    },
    passengerRated: {
      type: Boolean,
      default: false
    },
    ratingReminderSent: {
      type: Boolean,
      default: false
    },
    canBeRatedUntil: {
      type: Date,
      default: function() {
        // Ratings can be submitted up to 7 days after ride completion
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        return sevenDaysFromNow;
      }
    }
  },
  
  // 🆕 ENHANCED TIMESTAMP TRACKING
  timestamps: {
    requested: { type: Date, default: Date.now },
    accepted: Date,
    driverEnRoute: Date,
    arrived: Date,
    started: Date,
    completed: Date,
    cancelled: Date
  },
  
  // Ratings (legacy fields - kept for backward compatibility)
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  driverRating: {
    type: Number,
    min: 1,
    max: 5
  },
  passengerRating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  // Actual trip metrics (filled after completion)
  actualDistance: {
    type: Number, // in km
    default: 0
  },
  actualDuration: {
    type: Number, // in minutes
    default: 0
  },
  
  // 🆕 PAYMENT STATUS (Legacy - kept for backward compatibility)
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'mobile_money'],
    default: 'cash'
  },
  
  // Additional analytics fields
  peakHour: {
    type: Boolean,
    default: false
  },
  routeEfficiency: {
    type: Number, // Percentage of optimal route (0-100)
    min: 0,
    max: 100
  },
  
  // Real-time tracking data (for live analytics)
  tracking: {
    route: [{
      latitude: Number,
      longitude: Number,
      timestamp: Date,
      speed: Number
    }],
    polyline: String // For storing route geometry
  }
}, {
  timestamps: true, // This adds createdAt and updatedAt automatically
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==================== ENHANCED HISTORY FEATURES ====================

// Indexes for better query performance (Enhanced for history)
rideSchema.index({ passengerId: 1, createdAt: -1 });
rideSchema.index({ driverId: 1, createdAt: -1 });
rideSchema.index({ status: 1 });
rideSchema.index({ createdAt: 1 });
rideSchema.index({ 'pickup.coordinates': '2dsphere' });
rideSchema.index({ 'destination.coordinates': '2dsphere' });
rideSchema.index({ 'cancellation.cancelledAt': -1 });
rideSchema.index({ 'ratingStatus.canBeRatedUntil': 1 });
rideSchema.index({ status: 1, 'ratingStatus.driverRated': 1, 'ratingStatus.passengerRated': 1 });

// 🆕 Payment-specific indexes
rideSchema.index({ 'payment.status': 1 });
rideSchema.index({ 'payment.method': 1 });
rideSchema.index({ 'payment.paidAt': -1 });
rideSchema.index({ 'payment.gateway.transactionId': 1 });

// 🆕 HISTORY-SPECIFIC INDEXES
rideSchema.index({ 'pricing.totalFare': 1 }); // For fare-based filtering
rideSchema.index({ 'pickup.address': 'text', 'destination.address': 'text' }); // For text search
rideSchema.index({ actualDistance: 1 }); // For distance-based queries
rideSchema.index({ 'timestamps.completed': -1 }); // For completion date sorting

// ==================== VIRTUAL FIELDS ====================

// Virtual for calculating wait time (driver acceptance time)
rideSchema.virtual('waitTime').get(function() {
  if (this.timestamps.accepted && this.timestamps.requested) {
    return (this.timestamps.accepted - this.timestamps.requested) / 1000 / 60; // in minutes
  }
  return null;
});

// Virtual for calculating trip duration
rideSchema.virtual('tripDuration').get(function() {
  if (this.timestamps.completed && this.timestamps.started) {
    return (this.timestamps.completed - this.timestamps.started) / 1000 / 60; // in minutes
  }
  return null;
});

// Virtual for calculating cancellation time (time from acceptance to cancellation)
rideSchema.virtual('cancellationTime').get(function() {
  if (this.cancellation.cancelledAt && this.timestamps.accepted) {
    return (this.cancellation.cancelledAt - this.timestamps.accepted) / 1000 / 60; // in minutes
  }
  return null;
});

// Virtual to check if cancellation is eligible for free cancellation
rideSchema.virtual('isFreeCancellation').get(function() {
  const cancellationTime = this.cancellationTime;
  return cancellationTime !== null && cancellationTime <= 2; // Free within 2 minutes
});

// Virtual to check if ride can be rated
rideSchema.virtual('canBeRated').get(function() {
  const now = new Date();
  return this.status === 'completed' && 
         now <= this.ratingStatus.canBeRatedUntil &&
         (!this.ratingStatus.driverRated || !this.ratingStatus.passengerRated);
});

// 🆕 Virtual to check if payment is required
rideSchema.virtual('requiresPayment').get(function() {
  return this.status === 'completed' && 
         this.payment.status !== 'paid' && 
         this.payment.amount > 0;
});

// 🆕 Virtual to check if refund is available
rideSchema.virtual('isRefundable').get(function() {
  return this.status === 'cancelled' && 
         this.cancellation.refundAmount > 0 && 
         !this.cancellation.isRefundProcessed;
});

// 🆕 HISTORY-SPECIFIC VIRTUAL FIELDS
rideSchema.virtual('durationMinutes').get(function() {
  if (this.timestamps.started && this.timestamps.completed) {
    return Math.round((this.timestamps.completed - this.timestamps.started) / 1000 / 60);
  }
  return this.actualDuration || null;
});

rideSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

rideSchema.virtual('formattedTime').get(function() {
  return this.createdAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
});

rideSchema.virtual('isCompleted').get(function() {
  return this.status === 'completed';
});

rideSchema.virtual('isCancelled').get(function() {
  return this.status === 'cancelled';
});

rideSchema.virtual('hasPayment').get(function() {
  return this.payment.amount > 0 && this.payment.status === 'paid';
});

// ==================== INSTANCE METHODS ====================

// Method to update ride status with timestamp
rideSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  
  // Set the corresponding timestamp
  const timestampField = {
    'accepted': 'accepted',
    'driver_en_route': 'driverEnRoute',
    'arrived': 'arrived',
    'in_progress': 'started',
    'completed': 'completed',
    'cancelled': 'cancelled'
  }[newStatus];
  
  if (timestampField) {
    this.timestamps[timestampField] = new Date();
  }
  
  // If completed, set rating eligibility period and initialize payment
  if (newStatus === 'completed') {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    this.ratingStatus.canBeRatedUntil = sevenDaysFromNow;
    
    // Initialize payment amount if not set
    if (this.payment.amount === 0 && this.pricing.totalFare) {
      this.payment.amount = this.pricing.totalFare;
    }
  }
  
  return this.save();
};

// 🆕 Method to update payment information
rideSchema.methods.updatePayment = function(paymentData) {
  const allowedFields = [
    'method', 'status', 'amount', 'currency', 'gateway', 
    'walletTransactionId', 'authorizedAt', 'paidAt', 'failedAt',
    'refundedAt', 'failureReason', 'refundReason', 'refundAmount',
    'receiptNumber', 'invoiceUrl', 'isVerified', 'verifiedAt', 'verificationMethod'
  ];
  
  allowedFields.forEach(field => {
    if (paymentData[field] !== undefined) {
      if (field.includes('At') && paymentData[field]) {
        this.payment[field] = new Date(paymentData[field]);
      } else {
        this.payment[field] = paymentData[field];
      }
    }
  });
  
  // Update legacy payment fields for backward compatibility
  if (paymentData.status) {
    this.paymentStatus = paymentData.status;
  }
  if (paymentData.method) {
    this.paymentMethod = paymentData.method;
  }
  
  return this.save();
};

// 🆕 Method to process payment
rideSchema.methods.processPayment = async function(paymentMethod, paymentData = {}) {
  this.payment.method = paymentMethod;
  this.payment.status = 'authorized';
  this.payment.authorizedAt = new Date();
  
  // Store gateway-specific data
  if (paymentData.gateway) {
    this.payment.gateway = {
      ...this.payment.gateway,
      ...paymentData.gateway
    };
  }
  
  await this.save();
  return this;
};

// 🆕 Method to confirm payment
rideSchema.methods.confirmPayment = function(transactionData = {}) {
  this.payment.status = 'paid';
  this.payment.paidAt = new Date();
  this.payment.isVerified = true;
  this.payment.verifiedAt = new Date();
  
  // Update legacy field
  this.paymentStatus = 'paid';
  
  // Store transaction details
  if (transactionData.transactionId) {
    this.payment.gateway.transactionId = transactionData.transactionId;
  }
  if (transactionData.receiptNumber) {
    this.payment.receiptNumber = transactionData.receiptNumber;
  }
  
  return this.save();
};

// 🆕 Method to fail payment
rideSchema.methods.failPayment = function(reason = 'Payment failed') {
  this.payment.status = 'failed';
  this.payment.failedAt = new Date();
  this.payment.failureReason = reason;
  
  // Update legacy field
  this.paymentStatus = 'failed';
  
  return this.save();
};

// Method to cancel ride with cancellation details
rideSchema.methods.cancelRide = function(cancelledBy, reason, cancellationFee = 0, refundAmount = 0) {
  this.status = 'cancelled';
  this.timestamps.cancelled = new Date();
  
  // Set cancellation details
  this.cancellation = {
    ...this.cancellation,
    cancelledBy,
    cancelledAt: new Date(),
    cancellationReason: reason,
    cancellationFee,
    refundAmount,
    isRefundProcessed: refundAmount === 0, // Auto-mark as processed if no refund
    refundProcessedAt: refundAmount === 0 ? new Date() : null,
    penaltyApplied: cancellationFee > 0,
    penaltyAmount: cancellationFee,
    paymentRefundStatus: refundAmount > 0 ? 'pending' : 'completed'
  };
  
  // Update payment status if payment was made
  if (this.payment.status === 'paid' && refundAmount > 0) {
    this.payment.status = 'refunded';
    this.payment.refundedAt = new Date();
    this.payment.refundAmount = refundAmount;
    this.payment.refundReason = `Ride cancellation: ${reason}`;
    
    // Update legacy field
    this.paymentStatus = 'refunded';
  }
  
  return this.save();
};

// 🆕 Method to process refund for cancelled ride
rideSchema.methods.processRefund = function(transactionId = null, gatewayTransactionId = null) {
  if (this.status !== 'cancelled' || this.cancellation.refundAmount <= 0) {
    throw new Error('Refund not applicable for this ride');
  }
  
  this.cancellation.isRefundProcessed = true;
  this.cancellation.refundProcessedAt = new Date();
  this.cancellation.refundTransactionId = transactionId;
  this.cancellation.paymentRefundStatus = 'completed';
  
  if (gatewayTransactionId) {
    this.cancellation.refundGatewayTransactionId = gatewayTransactionId;
  }
  
  this.paymentStatus = 'refunded';
  
  return this.save();
};

// Method to mark rating as submitted
rideSchema.methods.markRatingSubmitted = function(userId) {
  if (userId === this.driverId?.toString()) {
    this.ratingStatus.driverRated = true;
  } else if (userId === this.passengerId?.toString()) {
    this.ratingStatus.passengerRated = true;
  }
  
  return this.save();
};

// Method to mark rating reminder as sent
rideSchema.methods.markRatingReminderSent = function() {
  this.ratingStatus.ratingReminderSent = true;
  return this.save();
};

// Virtual to check if specific user can rate this ride
rideSchema.methods.canUserRate = function(userId) {
  if (!this.canBeRated) return false;
  
  const now = new Date();
  if (now > this.ratingStatus.canBeRatedUntil) return false;
  
  if (userId === this.driverId?.toString()) {
    return !this.ratingStatus.driverRated;
  } else if (userId === this.passengerId?.toString()) {
    return !this.ratingStatus.passengerRated;
  }
  
  return false;
};

// Virtual to get which user can be rated by specific user
rideSchema.methods.getRateableUser = function(userId) {
  if (!this.canUserRate(userId)) return null;
  
  if (userId === this.driverId?.toString()) {
    return {
      userId: this.passengerId,
      userModel: 'Passenger',
      name: this.passengerId?.name || 'Passenger'
    };
  } else if (userId === this.passengerId?.toString()) {
    return {
      userId: this.driverId,
      userModel: 'Driver', 
      name: this.driverId?.name || 'Driver'
    };
  }
  
  return null;
};

// ==================== STATIC METHODS (ENHANCED FOR HISTORY) ====================

// 🆕 Static method for history queries with advanced filtering
rideSchema.statics.getUserHistory = function(userId, userType, filters = {}) {
  const query = {};
  
  // Determine field based on user type
  if (userType === 'passenger') {
    query.passengerId = userId;
  } else if (userType === 'driver') {
    query.driverId = userId;
  }
  
  // Apply filters
  if (filters.status) {
    query.status = filters.status;
  } else {
    // Default to completed rides for history
    query.status = 'completed';
  }
  
  if (filters.dateFrom || filters.dateTo) {
    query.createdAt = {};
    if (filters.dateFrom) {
      query.createdAt.$gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      query.createdAt.$lte = new Date(filters.dateTo);
    }
  }
  
  if (filters.minFare !== undefined) {
    query['pricing.totalFare'] = { ...query['pricing.totalFare'], $gte: parseFloat(filters.minFare) };
  }
  
  if (filters.maxFare !== undefined) {
    query['pricing.totalFare'] = { ...query['pricing.totalFare'], $lte: parseFloat(filters.maxFare) };
  }
  
  // Search in addresses
  if (filters.search) {
    query.$or = [
      { 'pickup.address': { $regex: filters.search, $options: 'i' } },
      { 'destination.address': { $regex: filters.search, $options: 'i' } }
    ];
  }
  
  // Vehicle type filter
  if (filters.vehicleType) {
    query.vehicleType = filters.vehicleType;
  }
  
  // Payment method filter
  if (filters.paymentMethod) {
    query['payment.method'] = filters.paymentMethod;
  }
  
  return this.find(query)
    .populate('driverId', 'name vehicle phone rating')
    .populate('passengerId', 'name phone rating')
    .sort({ createdAt: -1 });
};

// 🆕 Static method to get payment statistics
rideSchema.statics.getPaymentStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$payment.status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$payment.amount' },
        averageAmount: { $avg: '$payment.amount' },
        methods: { 
          $push: {
            method: '$payment.method',
            amount: '$payment.amount'
          }
        }
      }
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        totalAmount: { $round: ['$totalAmount', 2] },
        averageAmount: { $round: ['$averageAmount', 2] },
        methods: 1
      }
    }
  ]);
};

// 🆕 Static method to find rides with pending payments
rideSchema.statics.findPendingPayments = function(days = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return this.find({
    status: 'completed',
    'payment.status': { $in: ['pending', 'authorized'] },
    'timestamps.completed': { $gte: cutoffDate },
    'payment.amount': { $gt: 0 }
  })
  .populate('passengerId', 'name email phone')
  .populate('driverId', 'name email phone')
  .sort({ 'timestamps.completed': 1 });
};

// 🆕 Static method to find rides eligible for automatic refund
rideSchema.statics.findRefundableRides = function() {
  return this.find({
    status: 'cancelled',
    'cancellation.refundAmount': { $gt: 0 },
    'cancellation.isRefundProcessed': false,
    'cancellation.paymentRefundStatus': 'pending',
    'payment.status': 'paid'
  })
  .populate('passengerId', 'name email walletId')
  .sort({ 'cancellation.cancelledAt': 1 });
};

// Static method to get ride statistics
rideSchema.statics.getRideStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalRides: { $sum: 1 },
        completedRides: { 
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } 
        },
        cancelledRides: { 
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } 
        },
        totalRevenue: { 
          $sum: { 
            $cond: [
              { $and: [
                { $eq: ['$status', 'completed'] },
                { $eq: ['$payment.status', 'paid'] }
              ]},
              '$payment.amount',
              0
            ]
          } 
        },
        pendingRevenue: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$status', 'completed'] },
                { $in: ['$payment.status', ['pending', 'authorized']] }
              ]},
              '$payment.amount',
              0
            ]
          }
        },
        cancellationRevenue: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, '$cancellation.cancellationFee', 0] }
        },
        refundAmount: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, '$cancellation.refundAmount', 0] }
        },
        averageRating: { $avg: '$rating' },
        totalDistance: { $sum: '$actualDistance' },
        totalDuration: { $sum: '$actualDuration' }
      }
    }
  ]);
};

// Static method to get cancellation statistics
rideSchema.statics.getCancellationStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: 'cancelled',
        'cancellation.cancelledAt': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$cancellation.cancelledBy',
        count: { $sum: 1 },
        totalCancellationFees: { $sum: '$cancellation.cancellationFee' },
        totalRefunds: { $sum: '$cancellation.refundAmount' },
        totalPenalties: { $sum: '$cancellation.penaltyAmount' },
        averageCancellationTime: { $avg: '$cancellationTime' },
        paymentMethods: {
          $push: '$payment.method'
        }
      }
    },
    {
      $project: {
        cancelledBy: '$_id',
        count: 1,
        totalCancellationFees: 1,
        totalRefunds: 1,
        totalPenalties: 1,
        averageCancellationTime: { $round: ['$averageCancellationTime', 2] },
        paymentMethods: 1
      }
    }
  ]);
};

// Static method to find rides eligible for rating
rideSchema.statics.findRidesForRating = function(userId) {
  const now = new Date();
  
  return this.find({
    $or: [
      { driverId: userId },
      { passengerId: userId }
    ],
    status: 'completed',
    'ratingStatus.canBeRatedUntil': { $gte: now },
    $or: [
      { 
        driverId: userId,
        'ratingStatus.driverRated': false 
      },
      { 
        passengerId: userId,
        'ratingStatus.passengerRated': false 
      }
    ]
  })
  .populate('driverId', 'name profilePicture')
  .populate('passengerId', 'name profilePicture')
  .sort({ 'timestamps.completed': -1 });
};

// Static method to find rides eligible for rating reminders
rideSchema.statics.findRidesForRatingReminder = function(hoursAfterCompletion = 24) {
  const cutoffTime = new Date(Date.now() - hoursAfterCompletion * 60 * 60 * 1000);
  const now = new Date();
  
  return this.find({
    status: 'completed',
    'timestamps.completed': { 
      $lte: cutoffTime,
      $gte: new Date(now.setDate(now.getDate() - 7)) // Only rides from last 7 days
    },
    'ratingStatus.ratingReminderSent': false,
    'ratingStatus.canBeRatedUntil': { $gte: now },
    $or: [
      { 'ratingStatus.driverRated': false },
      { 'ratingStatus.passengerRated': false }
    ]
  })
  .populate('driverId', 'name email notificationPreferences')
  .populate('passengerId', 'name email notificationPreferences');
};

// Static method to get rating statistics for rides
rideSchema.statics.getRatingStats = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: 'completed',
        'timestamps.completed': { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalCompletedRides: { $sum: 1 },
        ridesWithDriverRating: {
          $sum: { $cond: [{ $eq: ['$ratingStatus.driverRated', true] }, 1, 0] }
        },
        ridesWithPassengerRating: {
          $sum: { $cond: [{ $eq: ['$ratingStatus.passengerRating', true] }, 1, 0] }
        },
        ridesWithBothRatings: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$ratingStatus.driverRated', true] },
                { $eq: ['$ratingStatus.passengerRated', true] }
              ]},
              1,
              0
            ]
          }
        },
        averageDriverRating: { $avg: '$driverRating' },
        averagePassengerRating: { $avg: '$passengerRating' }
      }
    }
  ]);
};

// 🆕 Static method for history analytics
rideSchema.statics.getHistoryAnalytics = async function(userId, userType, period = 'month') {
  const dateRange = getDateRange(period);
  
  let matchQuery = {
    createdAt: { $gte: dateRange.start, $lte: dateRange.end }
  };

  if (userType === 'passenger') {
    matchQuery.passengerId = userId;
  } else if (userType === 'driver') {
    matchQuery.driverId = userId;
  }

  const analytics = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalRides: { $sum: 1 },
        completedRides: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledRides: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalEarnings: { $sum: '$pricing.totalFare' },
        totalDistance: { $sum: '$actualDistance' },
        averageFare: { $avg: '$pricing.totalFare' },
        averageDistance: { $avg: '$actualDistance' },
        averageDuration: { $avg: '$actualDuration' }
      }
    }
  ]);

  return analytics[0] || {
    totalRides: 0,
    completedRides: 0,
    cancelledRides: 0,
    totalEarnings: 0,
    totalDistance: 0,
    averageFare: 0,
    averageDistance: 0,
    averageDuration: 0
  };
};

// 🆕 Static method for popular routes
rideSchema.statics.getPopularRoutes = async function(userId, userType, limit = 5) {
  let matchQuery = { status: 'completed' };

  if (userType === 'passenger') {
    matchQuery.passengerId = userId;
  } else if (userType === 'driver') {
    matchQuery.driverId = userId;
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          pickup: '$pickup.address',
          dropoff: '$destination.address'
        },
        count: { $sum: 1 },
        averageFare: { $avg: '$pricing.totalFare' },
        averageDistance: { $avg: '$actualDistance' },
        averageDuration: { $avg: '$actualDuration' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

// Helper function for date ranges
function getDateRange(period) {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case 'day':
      start.setDate(start.getDate() - 1);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setMonth(start.getMonth() - 1);
  }

  return { start, end };
}

// Ensure virtual fields are serialized
rideSchema.set('toJSON', { virtuals: true });
rideSchema.set('toObject', { virtuals: true });

export default mongoose.model('Ride', rideSchema);