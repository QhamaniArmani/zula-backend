import mongoose from 'mongoose';

const surgePricingSchema = new mongoose.Schema({
  area: {
    type: String,
    required: true
  },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  radius: {
    type: Number, // in kilometers
    default: 5
  },
  multiplier: {
    type: Number,
    required: true,
    min: 1.0,
    max: 3.0
  },
  demandLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'very_high'],
    default: 'medium'
  },
  active: {
    type: Boolean,
    default: false
  },
  startTime: Date,
  endTime: Date
}, {
  timestamps: true
});

// Create geospatial index for efficient location queries
surgePricingSchema.index({ coordinates: '2dsphere' });

export default mongoose.model('SurgePricing', surgePricingSchema);