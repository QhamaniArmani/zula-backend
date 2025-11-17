// models/CancellationPolicy.js
import mongoose from 'mongoose';

const cancellationRuleSchema = new mongoose.Schema({
  timeThreshold: {
    type: Number, // minutes after acceptance
    required: true,
    min: 0
  },
  cancellationFee: {
    type: Number, // percentage or fixed amount
    required: true,
    min: 0
  },
  feeType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  appliesTo: {
    type: String,
    enum: ['driver', 'passenger', 'both'],
    default: 'both'
  },
  refundPercentage: {
    type: Number, // percentage refund to passenger
    default: 100,
    min: 0,
    max: 100
  },
  description: {
    type: String,
    required: true
  }
});

const cancellationPolicySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  rules: [cancellationRuleSchema],
  
  // No-show penalties
  noShowPenalty: {
    driver: {
      amount: { 
        type: Number, 
        default: 50, // ZAR
        min: 0 
      },
      type: { 
        type: String, 
        enum: ['percentage', 'fixed'], 
        default: 'fixed' 
      },
      appliesAfter: { 
        type: Number, // minutes
        default: 10 
      }
    },
    passenger: {
      amount: { 
        type: Number, 
        default: 25, // ZAR
        min: 0 
      },
      type: { 
        type: String, 
        enum: ['percentage', 'fixed'], 
        default: 'fixed' 
      },
      appliesAfter: { 
        type: Number, // minutes
        default: 5 
      }
    }
  },
  
  // Free cancellation window (minutes)
  freeCancellationWindow: {
    type: Number,
    default: 2, // 2 minutes free cancellation
    min: 0
  },
  
  // Maximum cancellation fee percentage
  maxCancellationFee: {
    type: Number,
    default: 50, // 50% of fare
    min: 0,
    max: 100
  },
  
  // Auto-refund settings
  autoRefund: {
    enabled: {
      type: Boolean,
      default: true
    },
    processAfter: {
      type: Number, // hours
      default: 24
    }
  },
  
  // Policy status
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: String,
    default: '1.0'
  }
}, {
  timestamps: true
});

// Index for active policies
cancellationPolicySchema.index({ isActive: 1 });

// Method to get applicable rule based on time
cancellationPolicySchema.methods.getApplicableRule = function(timeSinceAcceptance) {
  return this.rules
    .sort((a, b) => b.timeThreshold - a.timeThreshold)
    .find(rule => timeSinceAcceptance >= rule.timeThreshold);
};

// Method to calculate cancellation charges
cancellationPolicySchema.methods.calculateCharges = function(rideFare, timeSinceAcceptance, cancelledBy) {
  let cancellationFee = 0;
  let refundAmount = rideFare;
  let penaltyApplied = false;
  let penaltyAmount = 0;
  
  // Free cancellation within grace period
  if (timeSinceAcceptance <= this.freeCancellationWindow) {
    return { cancellationFee: 0, refundAmount: rideFare, penaltyApplied: false, penaltyAmount: 0 };
  }
  
  // Get applicable cancellation rule
  const applicableRule = this.getApplicableRule(timeSinceAcceptance);
  
  if (applicableRule && applicableRule.appliesTo !== cancelledBy && applicableRule.appliesTo !== 'both') {
    // Rule doesn't apply to this user type
    return { cancellationFee: 0, refundAmount: rideFare, penaltyApplied: false, penaltyAmount: 0 };
  }
  
  if (applicableRule) {
    // Calculate cancellation fee
    if (applicableRule.feeType === 'percentage') {
      cancellationFee = (rideFare * applicableRule.cancellationFee) / 100;
      // Apply maximum fee cap
      cancellationFee = Math.min(cancellationFee, (rideFare * this.maxCancellationFee) / 100);
    } else {
      cancellationFee = Math.min(applicableRule.cancellationFee, rideFare);
    }
    
    // Calculate refund based on refund percentage
    const refundPercentage = applicableRule.refundPercentage || 100;
    refundAmount = rideFare - cancellationFee;
    
    // Apply no-show penalty
    const penaltyConfig = cancelledBy === 'driver' 
      ? this.noShowPenalty.driver 
      : this.noShowPenalty.passenger;
    
    const penaltyThreshold = cancelledBy === 'driver' 
      ? this.noShowPenalty.driver.appliesAfter 
      : this.noShowPenalty.passenger.appliesAfter;
    
    if (timeSinceAcceptance > penaltyThreshold && penaltyConfig.amount > 0) {
      penaltyApplied = true;
      penaltyAmount = penaltyConfig.type === 'percentage' 
        ? (rideFare * penaltyConfig.amount) / 100 
        : penaltyConfig.amount;
    }
  }
  
  // Ensure refund amount is not negative
  refundAmount = Math.max(0, refundAmount - penaltyAmount);
  
  return {
    cancellationFee,
    refundAmount,
    penaltyApplied,
    penaltyAmount
  };
};

export default mongoose.model('CancellationPolicy', cancellationPolicySchema);