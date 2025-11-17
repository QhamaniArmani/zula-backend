import WalletTopup from '../models/WalletTopup.js';
import Wallet from '../models/Wallet.js';

// @desc    Initiate wallet top-up
// @route   POST /api/wallet/topup/initiate
// @access  Private
export const initiateTopup = async (req, res) => {
  try {
    const { amount, paymentMethod, paymentProvider } = req.body;
    const userId = req.user.id;

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Create top-up record
    const topup = new WalletTopup({
      user: userId,
      amount,
      paymentMethod,
      paymentProvider,
      status: 'pending'
    });

    await topup.save();

    // In a real implementation, you would integrate with payment gateway here
    // For now, we'll simulate payment processing
    const paymentResult = await simulatePaymentProcessing(topup);

    res.status(201).json({
      success: true,
      message: 'Top-up initiated successfully',
      data: {
        topup: {
          id: topup._id,
          amount: topup.amount,
          status: topup.status,
          paymentMethod: topup.paymentMethod,
          paymentProvider: topup.paymentProvider,
          createdAt: topup.createdAt
        },
        paymentResult
      }
    });
  } catch (error) {
    console.error('Initiate top-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate top-up',
      error: error.message
    });
  }
};

// @desc    Process wallet top-up
// @route   POST /api/wallet/topup/:id/process
// @access  Private
export const processTopup = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, transactionId } = req.body;

    const topup = await WalletTopup.findById(id);

    if (!topup) {
      return res.status(404).json({
        success: false,
        message: 'Top-up record not found'
      });
    }

    // Check if user owns this top-up
    if (topup.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to process this top-up'
      });
    }

    if (topup.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Top-up already processed'
      });
    }

    if (paymentStatus === 'completed') {
      // Update top-up status
      topup.status = 'completed';
      topup.transactionId = transactionId;
      topup.completedAt = new Date();

      // Update wallet balance
      const wallet = await Wallet.findOne({ user: req.user.id });
      if (wallet) {
        wallet.balance += topup.amount;
        await wallet.save();
      } else {
        // Create wallet if it doesn't exist
        const newWallet = new Wallet({
          user: req.user.id,
          balance: topup.amount
        });
        await newWallet.save();
      }

      await topup.save();

      res.json({
        success: true,
        message: 'Top-up processed successfully',
        data: {
          topup: {
            id: topup._id,
            amount: topup.amount,
            status: topup.status,
            newBalance: wallet ? wallet.balance : topup.amount
          }
        }
      });
    } else if (paymentStatus === 'failed') {
      topup.status = 'failed';
      topup.completedAt = new Date();
      await topup.save();

      res.json({
        success: false,
        message: 'Top-up payment failed',
        data: { topup }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment status'
      });
    }
  } catch (error) {
    console.error('Process top-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process top-up',
      error: error.message
    });
  }
};

// @desc    Get top-up history
// @route   GET /api/wallet/topup/history
// @access  Private
export const getTopupHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const userId = req.user.id;

    const query = { user: userId };
    if (status) query.status = status;

    const topups = await WalletTopup.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await WalletTopup.countDocuments(query);

    res.json({
      success: true,
      data: {
        topups,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    console.error('Get top-up history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get top-up history',
      error: error.message
    });
  }
};

// @desc    Get top-up by ID
// @route   GET /api/wallet/topup/:id
// @access  Private
export const getTopupById = async (req, res) => {
  try {
    const topup = await WalletTopup.findById(req.params.id);

    if (!topup) {
      return res.status(404).json({
        success: false,
        message: 'Top-up not found'
      });
    }

    // Check if user owns this top-up
    if (topup.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this top-up'
      });
    }

    res.json({
      success: true,
      data: { topup }
    });
  } catch (error) {
    console.error('Get top-up by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get top-up',
      error: error.message
    });
  }
};

// Simulate payment processing (replace with actual payment gateway integration)
const simulatePaymentProcessing = async (topup) => {
  // Simulate API call to payment gateway
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        paymentUrl: `https://payment-gateway.zularides.co.za/pay/${topup._id}`,
        transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'redirect_required'
      });
    }, 100);
  });
};
