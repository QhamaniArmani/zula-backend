import mongoose from 'mongoose';

const pricingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['standard', 'premium', 'luxury']
  },
  baseFare: {
    type: Number,
    required: true,
    default: 20
  },
  perKmRate: {
    type: Number,
    required: true,
    default: 10
  },
  perMinuteRate: {
    type: Number,
    required: true,
    default: 1.7
  },
  minimumFare: {
    type: Number,
    required: true,
    default: 35
  },
  surgeMultiplier: {
    type: Number,
    default: 1.0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create compound index
pricingSchema.index({ name: 1, isActive: 1 });

export default mongoose.model('PricingModel', pricingSchema);