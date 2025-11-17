// utils/setupCancellationPolicy.js
import CancellationPolicy from '../models/CancellationPolicy.js';

const defaultPolicy = {
  name: 'ZulaRides Standard Cancellation Policy',
  description: 'Standard cancellation policy for ZulaRides platform',
  rules: [
    {
      timeThreshold: 2, // minutes
      cancellationFee: 0,
      feeType: 'fixed',
      appliesTo: 'both',
      refundPercentage: 100,
      description: 'Free cancellation within 2 minutes'
    },
    {
      timeThreshold: 5, // minutes
      cancellationFee: 10, // 10%
      feeType: 'percentage',
      appliesTo: 'passenger',
      refundPercentage: 90,
      description: '10% fee if passenger cancels after 5 minutes'
    },
    {
      timeThreshold: 5, // minutes
      cancellationFee: 20, // 20%
      feeType: 'percentage',
      appliesTo: 'driver',
      refundPercentage: 100,
      description: '20% fee if driver cancels after 5 minutes'
    },
    {
      timeThreshold: 10, // minutes
      cancellationFee: 25, // 25%
      feeType: 'percentage',
      appliesTo: 'both',
      refundPercentage: 75,
      description: '25% fee if cancelled after 10 minutes'
    }
  ],
  noShowPenalty: {
    driver: {
      amount: 50, // ZAR
      type: 'fixed',
      appliesAfter: 10 // minutes
    },
    passenger: {
      amount: 25, // ZAR
      type: 'fixed',
      appliesAfter: 5 // minutes
    }
  },
  freeCancellationWindow: 2, // minutes
  maxCancellationFee: 50, // 50% of fare
  autoRefund: {
    enabled: true,
    processAfter: 24 // hours
  },
  isActive: true,
  version: '1.0'
};

export async function setupDefaultCancellationPolicy() {
  try {
    const existingPolicy = await CancellationPolicy.findOne({ isActive: true });
    
    if (!existingPolicy) {
      await CancellationPolicy.create(defaultPolicy);
      console.log('✅ Default cancellation policy created successfully');
    } else {
      console.log('ℹ️ Active cancellation policy already exists');
    }
  } catch (error) {
    console.error('❌ Error setting up cancellation policy:', error);
  }
}