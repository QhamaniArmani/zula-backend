import mongoose from 'mongoose';

const walletTopupSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['credit_card', 'debit_card', 'bank_transfer', 'wallet', 'cash'],
    default: 'credit_card'
  },
  paymentProvider: {
    type: String,
    enum: ['paystack', 'flutterwave', 'stripe', 'cash', 'manual'],
    default: 'paystack'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    sparse: true
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
walletTopupSchema.index({ user: 1, createdAt: -1 });
walletTopupSchema.index({ status: 1 });
walletTopupSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

const WalletTopup = mongoose.model('WalletTopup', walletTopupSchema);

export default WalletTopup;
