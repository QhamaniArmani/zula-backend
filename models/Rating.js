// models/Rating.js
import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  // Reference to the ride
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true,
    index: true
  },
  
  // Who is being rated (driver or passenger)
  ratedUser: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'ratedUser.userModel'
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Driver', 'Passenger']
    },
    name: {
      type: String,
      required: true
    }
  },
  
  // Who is giving the rating
  ratingUser: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'ratingUser.userModel'
    },
    userModel: {
      type: String,
      required: true,
      enum: ['Driver', 'Passenger']
    },
    name: {
      type: String,
      required: true
    }
  },
  
  // Rating details
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number between 1 and 5'
    }
  },
  
  // Review text
  review: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  // Categories for detailed feedback
  categories: {
    punctuality: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    cleanliness: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    driving: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    communication: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    behavior: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    }
  },
  
  // Response from the rated user
  response: {
    text: {
      type: String,
      maxlength: 500,
      trim: true
    },
    respondedAt: {
      type: Date,
      default: null
    }
  },
  
  // Status and metadata
  status: {
    type: String,
    enum: ['active', 'flagged', 'removed'],
    default: 'active'
  },
  
  // Flags for inappropriate content
  flags: [{
    reason: {
      type: String,
      enum: ['spam', 'inappropriate', 'harassment', 'false_information', 'other'],
      required: true
    },
    description: String,
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    flaggedAt: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  
  // Analytics
  helpfulCount: {
    type: Number,
    default: 0
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
ratingSchema.index({ rideId: 1, 'ratingUser.userId': 1 }, { unique: true });
ratingSchema.index({ 'ratedUser.userId': 1, createdAt: -1 });
ratingSchema.index({ rating: 1 });
ratingSchema.index({ status: 1 });

// Virtual for calculating average category rating
ratingSchema.virtual('averageCategoryRating').get(function() {
  const categories = Object.values(this.categories).filter(val => val !== null);
  if (categories.length === 0) return null;
  return categories.reduce((sum, rating) => sum + rating, 0) / categories.length;
});

// Method to check if user can respond (within 30 days)
ratingSchema.methods.canRespond = function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.createdAt > thirtyDaysAgo && !this.response.respondedAt;
};

// Method to flag a rating
ratingSchema.methods.flagRating = function(reason, description, flaggedBy) {
  this.flags.push({
    reason,
    description,
    flaggedBy,
    flaggedAt: new Date()
  });
  
  if (this.flags.length >= 3) {
    this.status = 'flagged';
  }
  
  return this.save();
};

// Static method to get user's average rating
ratingSchema.statics.getUserAverageRating = async function(userId, userModel) {
  const result = await this.aggregate([
    {
      $match: {
        'ratedUser.userId': mongoose.Types.ObjectId(userId),
        'ratedUser.userModel': userModel,
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        totalRatings: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);
  
  if (result.length === 0) {
    return {
      averageRating: 0,
      totalRatings: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
  
  const distribution = result[0].ratingDistribution.reduce((acc, rating) => {
    acc[rating] = (acc[rating] || 0) + 1;
    return acc;
  }, { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  
  return {
    averageRating: Math.round(result[0].averageRating * 100) / 100,
    totalRatings: result[0].totalRatings,
    ratingDistribution: distribution
  };
};

// Static method to get category averages
ratingSchema.statics.getUserCategoryAverages = async function(userId, userModel) {
  const result = await this.aggregate([
    {
      $match: {
        'ratedUser.userId': mongoose.Types.ObjectId(userId),
        'ratedUser.userModel': userModel,
        status: 'active'
      }
    },
    {
      $group: {
        _id: null,
        punctuality: { $avg: '$categories.punctuality' },
        cleanliness: { $avg: '$categories.cleanliness' },
        driving: { $avg: '$categories.driving' },
        communication: { $avg: '$categories.communication' },
        behavior: { $avg: '$categories.behavior' }
      }
    }
  ]);
  
  if (result.length === 0) {
    return {
      punctuality: 0,
      cleanliness: 0,
      driving: 0,
      communication: 0,
      behavior: 0
    };
  }
  
  // Round to 2 decimal places and handle nulls
  const categories = {};
  for (const [key, value] of Object.entries(result[0])) {
    if (key !== '_id') {
      categories[key] = value ? Math.round(value * 100) / 100 : 0;
    }
  }
  
  return categories;
};

// Update updatedAt on save
ratingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Rating', ratingSchema);