// controllers/walletController.js
import Wallet from '../models/Wallet.js';

// Get wallet balance
export const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.id; // Use authenticated user ID

    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      // Create wallet if it doesn't exist
      wallet = await Wallet.create({ 
        userId, 
        balance: 0, 
        currency: 'ZAR',
        transactions: [] 
      });
    }

    res.json({
      success: true,
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency,
        isActive: wallet.isActive,
        totalTransactions: wallet.transactions.length
      }
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance',
      error: error.message
    });
  }
};

// Top up wallet
export const topUpWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, paymentMethod = 'card', reference } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance: 0,
        currency: 'ZAR',
        transactions: []
      });
    }

    const previousBalance = wallet.balance;
    const newBalance = wallet.balance + amount;

    const transaction = {
      type: 'credit',
      amount: amount,
      description: `Wallet top-up via ${paymentMethod}`,
      reference: reference || `topup_${Date.now()}`,
      status: 'completed',
      balanceAfter: newBalance,
      metadata: {
        paymentMethod,
        gateway: 'simulated',
        transactionTime: new Date().toISOString()
      },
      createdAt: new Date()
    };

    wallet.balance = newBalance;
    wallet.transactions.push(transaction);
    await wallet.save();

    res.json({
      success: true,
      message: 'Wallet topped up successfully',
      transaction: {
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        balanceAfter: transaction.balanceAfter,
        timestamp: transaction.createdAt
      },
      wallet: {
        previousBalance,
        newBalance,
        currency: wallet.currency
      }
    });
  } catch (error) {
    console.error('Top up wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to top up wallet',
      error: error.message
    });
  }
};

// Get transaction history
export const getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 10, 
      type, // credit, debit, refund
      startDate, 
      endDate 
    } = req.query;

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    // Filter transactions
    let transactions = wallet.transactions;

    // Filter by type
    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }

    // Filter by date range
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      transactions = transactions.filter(t => 
        new Date(t.createdAt) >= start && new Date(t.createdAt) <= end
      );
    }

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const skip = (page - 1) * limit;
    const paginatedTransactions = transactions.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      transactions: paginatedTransactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(transactions.length / limit),
        totalTransactions: transactions.length,
        hasNext: page < Math.ceil(transactions.length / limit),
        hasPrev: page > 1
      },
      wallet: {
        currentBalance: wallet.balance,
        currency: wallet.currency
      }
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history',
      error: error.message
    });
  }
};

// Refund to wallet
export const refundToWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, reason, reference, rideId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      wallet = new Wallet({
        userId,
        balance: 0,
        currency: 'ZAR',
        transactions: []
      });
    }

    const previousBalance = wallet.balance;
    const newBalance = wallet.balance + amount;

    const transaction = {
      type: 'credit',
      amount: amount,
      description: reason || 'Wallet refund',
      reference: reference || `refund_${Date.now()}`,
      status: 'completed',
      balanceAfter: newBalance,
      metadata: {
        reason,
        rideId,
        refundType: 'manual'
      },
      createdAt: new Date()
    };

    wallet.balance = newBalance;
    wallet.transactions.push(transaction);
    await wallet.save();

    res.json({
      success: true,
      message: 'Refund processed successfully',
      transaction: {
        id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        balanceAfter: transaction.balanceAfter,
        timestamp: transaction.createdAt
      },
      wallet: {
        previousBalance,
        newBalance,
        currency: wallet.currency
      }
    });
  } catch (error) {
    console.error('Refund to wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

// Get wallet statistics
export const getWalletStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    const transactions = wallet.transactions;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTransactions = transactions.filter(t => 
      new Date(t.createdAt) >= thirtyDaysAgo
    );

    const stats = {
      currentBalance: wallet.balance,
      totalTransactions: transactions.length,
      recentTransactions: recentTransactions.length,
      totalCredits: transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0),
      totalDebits: transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0),
      transactionTypes: {
        credit: transactions.filter(t => t.type === 'credit').length,
        debit: transactions.filter(t => t.type === 'debit').length,
        refund: transactions.filter(t => t.type === 'refund').length
      }
    };

    res.json({
      success: true,
      stats,
      period: 'all_time',
      recentPeriod: 'last_30_days'
    });
  } catch (error) {
    console.error('Get wallet stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet statistics',
      error: error.message
    });
  }
};

// Create wallet (if needed)
export const createWallet = async (req, res) => {
  try {
    const userId = req.user.id;

    let wallet = await Wallet.findOne({ userId });
    
    if (wallet) {
      return res.status(400).json({
        success: false,
        message: 'Wallet already exists'
      });
    }

    wallet = await Wallet.create({
      userId,
      balance: 0,
      currency: 'ZAR',
      transactions: []
    });

    res.status(201).json({
      success: true,
      message: 'Wallet created successfully',
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency,
        isActive: wallet.isActive
      }
    });
  } catch (error) {
    console.error('Create wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create wallet',
      error: error.message
    });
  }
};