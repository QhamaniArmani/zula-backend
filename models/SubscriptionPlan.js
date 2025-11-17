// models/SubscriptionPlan.js
import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'ZAR'
  },
  commissionRate: {
    type: Number, // percentage
    required: true,
    min: 0,
    max: 100
  },
  features: [String],
  maxWeeklyRides: {
    type: Number, // null means unlimited
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);