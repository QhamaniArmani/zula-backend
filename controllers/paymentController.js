// controllers/paymentController.js
import Payment from '../models/Payment.js';
import Wallet from '../models/Wallet.js';
import Ride from '../models/Ride.js';
import { rideStore } from '../utils/rideStore.js';

export const paymentController = {
  // Simulate payment for a completed ride
  async processRidePayment(req, res) {
    try {
      const { rideId, paymentMethod = 'wallet' } = req.body;
      const userId = req.user.id;

      // Find the ride
      const ride = await Ride.findById(rideId);
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found'
        });
      }

      // Check if ride belongs to user
      if (ride.passengerId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to pay for this ride'
        });
      }

      // Check if ride is completed
      if (ride.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Ride is not completed yet'
        });
      }

      // Check if payment already exists
      const existingPayment = await Payment.findOne({ rideId });
      if (existingPayment) {
        return res.status(400).json({
          success: false,
          message: 'Payment already processed for this ride'
        });
      }

      const rideAmount = ride.pricing.totalFare || ride.fareAmount;

      // Process payment based on method
      let paymentResult;
      switch (paymentMethod) {
        case 'wallet':
          paymentResult = await processWalletPayment(userId, rideAmount, rideId);
          break;
        case 'card':
          paymentResult = await simulateCardPayment(userId, rideAmount, rideId);
          break;
        case 'cash':
          paymentResult = await processCashPayment(userId, rideAmount, rideId);
          break;
        default:
          throw new Error('Invalid payment method');
      }

      // Create payment record
      const payment = await Payment.create({
        userId,
        rideId,
        amount: rideAmount,
        paymentMethod,
        status: paymentResult.success ? 'completed' : 'failed',
        description: `Payment for ride ${rideId}`,
        metadata: {
          rideFrom: ride.pickupLocation?.address,
          rideTo: ride.dropoffLocation?.address,
          distance: ride.distance,
          duration: ride.duration,
          ...paymentResult.metadata
        }
      });

      if (!paymentResult.success) {
        return res.status(400).json({
          success: false,
          message: paymentResult.message,
          paymentId: payment._id
        });
      }

      // Update ride payment status
      ride.paymentStatus = 'paid';
      await ride.save();

      // Update in-memory ride store if exists
      if (rideStore.rides[rideId]) {
        rideStore.rides[rideId].paymentStatus = 'paid';
      }

      res.json({
        success: true,
        message: 'Payment processed successfully',
        payment: {
          id: payment._id,
          transactionId: payment.transactionId,
          amount: payment.amount,
          method: payment.paymentMethod,
          status: payment.status,
          timestamp: payment.createdAt
        },
        walletBalance: paymentResult.walletBalance
      });

    } catch (error) {
      console.error('Payment processing error:', error);
      res.status(500).json({
        success: false,
        message: 'Payment processing failed',
        error: error.message
      });
    }
  },

  // Get payment history for user
  async getPaymentHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      const payments = await Payment.find({ userId })
        .populate('rideId', 'pickupLocation dropoffLocation distance duration')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Payment.countDocuments({ userId });

      res.json({
        success: true,
        payments,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        totalPayments: total
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment history',
        error: error.message
      });
    }
  },

  // Get payment details
  async getPaymentDetails(req, res) {
    try {
      const { paymentId } = req.params;
      const userId = req.user.id;

      const payment = await Payment.findOne({ _id: paymentId, userId })
        .populate('rideId')
        .populate('userId', 'name email');

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      res.json({
        success: true,
        payment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch payment details',
        error: error.message
      });
    }
  }
};

// Helper functions for different payment methods
async function processWalletPayment(userId, amount, rideId) {
  try {
    // Find user's wallet
    let wallet = await Wallet.findOne({ userId });
    
    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: 0 });
    }

    // Check sufficient balance
    if (wallet.balance < amount) {
      return {
        success: false,
        message: 'Insufficient wallet balance',
        metadata: { currentBalance: wallet.balance, requiredAmount: amount }
      };
    }

    // Deduct amount from wallet
    wallet.balance -= amount;
    
    // Add transaction to history
    wallet.transactions.push({
      type: 'debit',
      amount: amount,
      description: `Ride payment for ${rideId}`,
      rideId: rideId,
      balanceAfter: wallet.balance
    });

    await wallet.save();

    return {
      success: true,
      walletBalance: wallet.balance,
      metadata: { previousBalance: wallet.balance + amount, newBalance: wallet.balance }
    };
  } catch (error) {
    throw new Error(`Wallet payment failed: ${error.message}`);
  }
}

async function simulateCardPayment(userId, amount, rideId) {
  // Simulate card payment processing
  // In real implementation, integrate with payment gateway like Stripe, PayPal, etc.
  
  // Simulate random failures (5% failure rate for demo)
  const isSuccess = Math.random() > 0.05;
  
  if (!isSuccess) {
    return {
      success: false,
      message: 'Card payment failed. Please try again or use another payment method.',
      metadata: { failureReason: 'Simulated card decline' }
    };
  }

  return {
    success: true,
    message: 'Card payment processed successfully',
    metadata: { gateway: 'simulated', transactionTime: new Date().toISOString() }
  };
}

async function processCashPayment(userId, amount, rideId) {
  // For cash payments, we just record the payment
  // Driver will collect cash directly
  
  return {
    success: true,
    message: 'Cash payment recorded. Please pay the driver directly.',
    metadata: { collectionMethod: 'cash_to_driver' }
  };
}