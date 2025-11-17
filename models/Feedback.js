import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  ride: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 500
  },
  feedbackType: {
    type: String,
    enum: ['to_driver', 'to_passenger'],
    required: true
  },
  category: {
    type: String,
    enum: ['safety', 'cleanliness', 'punctuality', 'communication', 'driving', 'vehicle', 'other'],
    default: 'other'
  },
  isAnonymous: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Compound indexes for performance
feedbackSchema.index({ ride: 1, user: 1 }, { unique: true });
feedbackSchema.index({ targetUser: 1, createdAt: -1 });
feedbackSchema.index({ feedbackType: 1, rating: 1 });

// Virtual for formatted rating (e.g., 4.5 stars)
feedbackSchema.virtual('formattedRating').get(function() {
  return '★'.repeat(Math.floor(this.rating)) + '☆'.repeat(5 - Math.floor(this.rating));
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;
