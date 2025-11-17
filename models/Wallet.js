import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['topup', 'ride_payment', 'refund', 'withdrawal'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  reference: {
    type: String, // For payment gateway references or ride IDs
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  transactions: [transactionSchema]
}, {
  timestamps: true
});

// Index for faster queries
walletSchema.index({ userId: 1 });
walletSchema.index({ 'transactions.createdAt': -1 });

// Static method to get wallet by user ID
walletSchema.statics.findByUserId = function(userId) {
  return this.findOne({ userId }).populate('userId', 'name email phone');
};

// Instance method to add transaction
walletSchema.methods.addTransaction = function(transactionData) {
  this.transactions.push(transactionData);
  return this.save();
};

// Instance method to get transaction history with pagination
walletSchema.methods.getTransactionHistory = function(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const transactions = this.transactions
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(skip, skip + limit);
  
  return {
    transactions,
    pagination: {
      page,
      limit,
      total: this.transactions.length,
      pages: Math.ceil(this.transactions.length / limit)
    }
  };
};

export default mongoose.model('Wallet', walletSchema);