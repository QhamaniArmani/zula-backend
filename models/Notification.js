// models/Notification.js
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Recipient information
  recipient: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipient.userModel'
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Driver', 'Passenger', 'Admin']
    },
    email: String,
    phone: String,
    deviceTokens: [String] // For push notifications
  },

  // Notification content
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // Additional data for deep linking
    default: {}
  },

  // Notification type and category
  type: {
    type: String,
    required: true,
    enum: [
      // Ride-related notifications
      'ride_requested',
      'ride_accepted',
      'ride_cancelled',
      'driver_en_route',
      'driver_arrived',
      'ride_started',
      'ride_completed',
      'ride_rated',
      
      // Payment notifications
      'payment_successful',
      'payment_failed',
      'refund_processed',
      
      // System notifications
      'driver_approved',
      'document_expired',
      'promotion_offer',
      'safety_alert',
      
      // Emergency notifications
      'sos_activated',
      'emergency_contact',
      
      // Rating notifications
      'new_rating',
      'rating_reminder'
    ]
  },
  
  category: {
    type: String,
    enum: ['ride', 'payment', 'system', 'safety', 'promotion', 'rating'],
    required: true
  },

  // Delivery channels and status
  channels: {
    inApp: {
      sent: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      readAt: Date
    },
    push: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      failed: { type: Boolean, default: false },
      failureReason: String
    },
    sms: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      failed: { type: Boolean, default: false },
      failureReason: String,
      messageId: String
    },
    email: {
      sent: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      failed: { type: Boolean, default: false },
      failureReason: String,
      messageId: String
    }
  },

  // Priority and scheduling
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date,
    default: function() {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      return thirtyDays;
    }
  },

  // Related entities
  relatedEntities: {
    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride'
    },
    paymentId: String,
    ratingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rating'
    }
  },

  // Analytics
  clickThrough: {
    count: { type: Number, default: 0 },
    lastClicked: Date
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed', 'cancelled'],
    default: 'pending'
  },

  // Retry logic
  retryCount: {
    type: Number,
    default: 0
  },
  
  maxRetries: {
    type: Number,
    default: 3
  },

  // Timestamps
  sentAt: Date,
  deliveredAt: Date,
  failedAt: Date
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ 'recipient.userId': 1, createdAt: -1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ category: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ scheduledFor: 1 });
notificationSchema.index({ status: 1, scheduledFor: 1 });
notificationSchema.index({ 'channels.inApp.read': 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for notification age
notificationSchema.virtual('ageInHours').get(function() {
  return (new Date() - this.createdAt) / (1000 * 60 * 60);
});

// Virtual to check if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual to check if all delivery failed
notificationSchema.virtual('allDeliveryFailed').get(function() {
  const channels = this.channels;
  return (
    (channels.push.sent && channels.push.failed) &&
    (channels.sms.sent && channels.sms.failed) &&
    (channels.email.sent && channels.email.failed)
  );
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.channels.inApp.read = true;
  this.channels.inApp.readAt = new Date();
  return this.save();
};

// Method to record click-through
notificationSchema.methods.recordClickThrough = function() {
  this.clickThrough.count += 1;
  this.clickThrough.lastClicked = new Date();
  return this.save();
};

// Method to retry sending
notificationSchema.methods.canRetry = function() {
  return this.status === 'failed' && 
         this.retryCount < this.maxRetries &&
         !this.isExpired;
};

// Static method to get unread count for user
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({
    'recipient.userId': userId,
    'channels.inApp.read': false,
    'channels.inApp.sent': true,
    status: { $in: ['sent', 'delivered'] }
  });
};

// Static method to find pending notifications
notificationSchema.statics.findPendingNotifications = function(limit = 100) {
  return this.find({
    status: 'pending',
    scheduledFor: { $lte: new Date() },
    expiresAt: { $gt: new Date() }
  })
  .sort({ priority: -1, scheduledFor: 1 })
  .limit(limit);
};

// Static method to cleanup old notifications
notificationSchema.statics.cleanupOldNotifications = async function(days = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  const result = await this.deleteMany({
    createdAt: { $lt: cutoffDate },
    'channels.inApp.read': true
  });
  
  return result.deletedCount;
};

// Pre-save middleware to set category based on type
notificationSchema.pre('save', function(next) {
  if (this.isModified('type')) {
    const categoryMap = {
      // Ride-related
      'ride_requested': 'ride',
      'ride_accepted': 'ride',
      'ride_cancelled': 'ride',
      'driver_en_route': 'ride',
      'driver_arrived': 'ride',
      'ride_started': 'ride',
      'ride_completed': 'ride',
      
      // Payment
      'payment_successful': 'payment',
      'payment_failed': 'payment',
      'refund_processed': 'payment',
      
      // System
      'driver_approved': 'system',
      'document_expired': 'system',
      'promotion_offer': 'promotion',
      
      // Safety
      'sos_activated': 'safety',
      'emergency_contact': 'safety',
      
      // Rating
      'ride_rated': 'rating',
      'new_rating': 'rating',
      'rating_reminder': 'rating'
    };
    
    this.category = categoryMap[this.type] || 'system';
  }
  next();
});

export default mongoose.model('Notification', notificationSchema);