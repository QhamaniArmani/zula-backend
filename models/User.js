import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  userType: {
    type: String,
    enum: ['passenger', 'driver', 'admin'],
    default: 'passenger'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profilePhoto: {
    type: String,
    default: null
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
  
  dateOfBirth: Date,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: 'Rwanda'
    }
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    currency: {
      type: String,
      default: 'ZAR'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      rideUpdates: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      paymentUpdates: { type: Boolean, default: true }
    }
  },
  verification: {
    emailVerified: {
      type: Boolean,
      default: false
    },
    phoneVerified: {
      type: Boolean,
      default: false
    },
    identityVerified: {
      type: Boolean,
      default: false
    }
  },
  stats: {
    totalRides: {
      type: Number,
      default: 0
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ fcmToken: 1 }); // 🆕 Index for FCM token queries

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Check password method
userSchema.methods.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function() {
  return jwt.sign(
    { 
      id: this._id,
      email: this.email,
      userType: this.userType 
    },
    process.env.JWT_SECRET || 'your_jwt_secret',
    { expiresIn: '7d' }
  );
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Virtual for user's full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// 🆕 VIRTUAL FOR NOTIFICATION STATUS
userSchema.virtual('canReceivePushNotifications').get(function() {
  return this.fcmToken && 
         this.preferences.notifications.push && 
         this.preferences.notifications.rideUpdates &&
         this.isActive;
});

// Method to get user profile
userSchema.methods.getProfile = function() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    userType: this.userType,
    profilePhoto: this.profilePhoto,
    isActive: this.isActive,
    verification: this.verification,
    stats: this.stats,
    preferences: this.preferences,
    canReceivePushNotifications: this.canReceivePushNotifications // 🆕 Include notification status
  };
};

// 🆕 METHOD TO UPDATE FCM TOKEN
userSchema.methods.updateFCMToken = function(token, deviceType = 'android') {
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

// 🆕 METHOD TO REMOVE FCM TOKEN
userSchema.methods.removeFCMToken = function(token = null) {
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

// 🆕 METHOD TO GET ACTIVE NOTIFICATION TOKENS
userSchema.methods.getActiveNotificationTokens = function() {
  const activeTokens = this.notificationTokens
    .filter(token => token.isActive)
    .map(token => token.token);
  
  // Include the main fcmToken if it exists and is not in the array
  if (this.fcmToken && !activeTokens.includes(this.fcmToken)) {
    activeTokens.push(this.fcmToken);
  }
  
  return activeTokens;
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics.findActiveUsers = function(userType = null) {
  const query = { isActive: true };
  if (userType) {
    query.userType = userType;
  }
  return this.find(query);
};

// 🆕 STATIC METHOD TO FIND USERS WITH ACTIVE FCM TOKENS
userSchema.statics.findUsersWithFCMTokens = function(userType = null) {
  const query = { 
    isActive: true,
    fcmToken: { $ne: null, $exists: true },
    'preferences.notifications.push': true,
    'preferences.notifications.rideUpdates': true
  };
  
  if (userType) {
    query.userType = userType;
  }
  
  return this.find(query);
};

// 🆕 UPDATE FCM TOKEN WHEN USER IS SAVED
userSchema.pre('save', function(next) {
  if (this.isModified('fcmToken') && this.fcmToken) {
    this.fcmTokenUpdatedAt = new Date();
  }
  next();
});

export default mongoose.model('User', userSchema);