// controllers/cancellationController.js
import Ride from '../models/Ride.js';
import CancellationPolicy from '../models/CancellationPolicy.js';
import Driver from '../models/Driver.js';
import Passenger from '../models/Passenger.js';

class CancellationController {
  
  // Cancel a ride
  async cancelRide(req, res) {
    try {
      const { rideId } = req.params;
      const { cancelledBy, reason, notes } = req.body;
      
      // Validate input
      if (!['driver', 'passenger', 'system', 'admin'].includes(cancelledBy)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid cancellation initiator'
        });
      }
      
      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cancellation reason is required'
        });
      }
      
      // Find the ride with populated references
      const ride = await Ride.findById(rideId)
        .populate('driverId', 'name email phone stats')
        .populate('passengerId', 'name email phone stats');
      
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found'
        });
      }
      
      // Check if ride can be cancelled
      if (['completed', 'cancelled'].includes(ride.status)) {
        return res.status(400).json({
          success: false,
          message: `Ride is already ${ride.status}`
        });
      }
      
      // Get active cancellation policy
      const policy = await CancellationPolicy.findOne({ isActive: true });
      if (!policy) {
        return res.status(500).json({
          success: false,
          message: 'No active cancellation policy found'
        });
      }
      
      // Calculate time since acceptance (or request if not accepted)
      const referenceTime = ride.timestamps.accepted || ride.timestamps.requested;
      const timeSinceReference = (new Date() - referenceTime) / (1000 * 60); // minutes
      
      // Calculate cancellation fees and refunds
      const rideFare = ride.pricing.totalFare || 0;
      const cancellationDetails = policy.calculateCharges(rideFare, timeSinceReference, cancelledBy);
      
      // Update ride with cancellation details using the model method
      await ride.cancelRide(
        cancelledBy, 
        reason, 
        cancellationDetails.cancellationFee, 
        cancellationDetails.refundAmount
      );
      
      // Add penalty if applicable
      if (cancellationDetails.penaltyApplied) {
        ride.cancellation.penaltyApplied = true;
        ride.cancellation.penaltyAmount = cancellationDetails.penaltyAmount;
        await ride.save();
      }
      
      // Update user statistics
      await this.updateUserStats(ride, cancelledBy);
      
      // Notify relevant parties via Socket.io
      this.notifyCancellation(req, ride, cancelledBy, reason);
      
      // Populate the updated ride for response
      const updatedRide = await Ride.findById(rideId)
        .populate('driverId', 'name email phone')
        .populate('passengerId', 'name email phone');
      
      res.json({
        success: true,
        message: 'Ride cancelled successfully',
        data: {
          ride: updatedRide,
          cancellationDetails: {
            cancellationFee: cancellationDetails.cancellationFee,
            refundAmount: cancellationDetails.refundAmount,
            penaltyApplied: cancellationDetails.penaltyApplied,
            penaltyAmount: cancellationDetails.penaltyAmount,
            freeCancellation: timeSinceReference <= policy.freeCancellationWindow
          }
        }
      });
      
    } catch (error) {
      console.error('Cancellation error:', error);
      res.status(500).json({
        success: false,
        message: 'Error cancelling ride',
        error: error.message
      });
    }
  }
  
  // Update user statistics after cancellation
  async updateUserStats(ride, cancelledBy) {
    try {
      if (cancelledBy === 'driver') {
        // Update driver cancellation stats
        await Driver.findByIdAndUpdate(ride.driverId._id, {
          $inc: { 
            'stats.cancelledRides': 1,
            'stats.totalCancellations': 1
          },
          $set: {
            'stats.lastCancellationAt': new Date()
          }
        });
      } else if (cancelledBy === 'passenger') {
        // Update passenger cancellation stats
        await Passenger.findByIdAndUpdate(ride.passengerId._id, {
          $inc: { 
            'stats.cancelledRides': 1,
            'stats.totalCancellations': 1
          },
          $set: {
            'stats.lastCancellationAt': new Date()
          }
        });
      }
      
      // Update overall cancellation rate for both users
      if (ride.driverId) {
        const driverRides = await Ride.countDocuments({ driverId: ride.driverId._id });
        const driverCancellations = await Ride.countDocuments({ 
          driverId: ride.driverId._id, 
          status: 'cancelled',
          'cancellation.cancelledBy': 'driver'
        });
        
        const cancellationRate = driverRides > 0 ? (driverCancellations / driverRides) * 100 : 0;
        
        await Driver.findByIdAndUpdate(ride.driverId._id, {
          $set: { 'stats.cancellationRate': Math.round(cancellationRate * 100) / 100 }
        });
      }
      
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  }
  
  // Notify parties about cancellation
  notifyCancellation(req, ride, cancelledBy, reason) {
    try {
      const io = req.app.get('io');
      
      if (!io) {
        console.log('Socket.io not available for notification');
        return;
      }
      
      const notificationData = {
        rideId: ride._id,
        cancelledBy,
        reason,
        cancellationFee: ride.cancellation.cancellationFee,
        refundAmount: ride.cancellation.refundAmount,
        penaltyAmount: ride.cancellation.penaltyAmount,
        timestamp: new Date()
      };
      
      // Notify both parties
      if (ride.driverId) {
        io.to(`driver-${ride.driverId._id}`).emit('ride-cancelled', notificationData);
      }
      
      if (ride.passengerId) {
        io.to(`passenger-${ride.passengerId._id}`).emit('ride-cancelled', notificationData);
      }
      
      // Notify admin if penalty applied
      if (cancelledBy === 'driver' && ride.cancellation.penaltyApplied) {
        io.to('admin').emit('driver-penalty-applied', {
          ...notificationData,
          driverId: ride.driverId._id,
          driverName: ride.driverId.name,
          penaltyAmount: ride.cancellation.penaltyAmount
        });
      }
      
      console.log(`Cancellation notifications sent for ride ${ride._id}`);
    } catch (error) {
      console.error('Error sending cancellation notifications:', error);
    }
  }
  
  // Get cancellation statistics
  async getCancellationStats(req, res) {
    try {
      const { period = 'monthly' } = req.query;
      const dateRange = getDateRange(period);
      
      const stats = await Ride.getCancellationStats(dateRange.start, dateRange.end);
      
      const totalCancellations = await Ride.countDocuments({
        status: 'cancelled',
        'cancellation.cancelledAt': { $gte: dateRange.start, $lte: dateRange.end }
      });
      
      // Get cancellation reasons breakdown
      const reasonsBreakdown = await Ride.aggregate([
        {
          $match: {
            status: 'cancelled',
            'cancellation.cancelledAt': { $gte: dateRange.start, $lte: dateRange.end }
          }
        },
        {
          $group: {
            _id: '$cancellation.cancellationReason',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);
      
      res.json({
        success: true,
        data: {
          stats,
          totalCancellations,
          reasonsBreakdown,
          period,
          dateRange
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching cancellation statistics',
        error: error.message
      });
    }
  }
  
  // Process refund for a cancelled ride
  async processRefund(req, res) {
    try {
      const { rideId } = req.params;
      const { transactionId } = req.body;
      
      const ride = await Ride.findOne({
        _id: rideId,
        status: 'cancelled',
        'cancellation.refundAmount': { $gt: 0 },
        'cancellation.isRefundProcessed': false
      }).populate('passengerId', 'name email');
      
      if (!ride) {
        return res.status(404).json({
          success: false,
          message: 'Ride not found or refund not applicable'
        });
      }
      
      // Simulate refund process (to be replaced with PayFast integration)
      const refundResult = await this.simulateRefundProcess(ride, transactionId);
      
      if (refundResult.success) {
        // Update ride with refund processed using model method
        await ride.processRefund(refundResult.transactionId);
        
        // Notify passenger about refund
        this.notifyRefundProcessed(req, ride, refundResult);
        
        res.json({
          success: true,
          message: 'Refund processed successfully',
          data: {
            refundAmount: ride.cancellation.refundAmount,
            transactionId: refundResult.transactionId,
            processedAt: new Date(),
            passenger: {
              name: ride.passengerId.name,
              email: ride.passengerId.email
            }
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Refund processing failed',
          error: refundResult.error
        });
      }
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing refund',
        error: error.message
      });
    }
  }
  
  // Simulate refund process (to be replaced with PayFast integration)
  async simulateRefundProcess(ride, transactionId) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate random success/failure for testing
        const success = Math.random() > 0.1; // 90% success rate for simulation
        
        if (success) {
          resolve({
            success: true,
            transactionId: transactionId || `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            amount: ride.cancellation.refundAmount,
            currency: 'ZAR',
            status: 'processed',
            processedAt: new Date()
          });
        } else {
          resolve({
            success: false,
            error: 'Payment gateway temporarily unavailable',
            retryAfter: '5 minutes'
          });
        }
      }, 1500);
    });
  }
  
  // Notify about refund processing
  notifyRefundProcessed(req, ride, refundResult) {
    try {
      const io = req.app.get('io');
      
      if (io && ride.passengerId) {
        io.to(`passenger-${ride.passengerId._id}`).emit('refund-processed', {
          rideId: ride._id,
          refundAmount: ride.cancellation.refundAmount,
          transactionId: refundResult.transactionId,
          processedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error sending refund notification:', error);
    }
  }
  
  // Get cancellation policy
  async getCancellationPolicy(req, res) {
    try {
      const policy = await CancellationPolicy.findOne({ isActive: true });
      
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'No active cancellation policy found'
        });
      }
      
      res.json({
        success: true,
        data: policy
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching cancellation policy',
        error: error.message
      });
    }
  }
  
  // Update cancellation policy (admin only)
  async updateCancellationPolicy(req, res) {
    try {
      const { policyId } = req.params;
      const updateData = req.body;
      
      const policy = await CancellationPolicy.findByIdAndUpdate(
        policyId,
        updateData,
        { new: true, runValidators: true }
      );
      
      if (!policy) {
        return res.status(404).json({
          success: false,
          message: 'Cancellation policy not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Cancellation policy updated successfully',
        data: policy
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating cancellation policy',
        error: error.message
      });
    }
  }
  
  // Get pending refunds
  async getPendingRefunds(req, res) {
    try {
      const pendingRefunds = await Ride.find({
        status: 'cancelled',
        'cancellation.refundAmount': { $gt: 0 },
        'cancellation.isRefundProcessed': false
      })
      .populate('passengerId', 'name email phone')
      .populate('driverId', 'name email')
      .sort({ 'cancellation.cancelledAt': 1 });
      
      const totalPendingAmount = pendingRefunds.reduce((sum, ride) => 
        sum + ride.cancellation.refundAmount, 0
      );
      
      res.json({
        success: true,
        data: {
          pendingRefunds,
          totalPendingAmount,
          count: pendingRefunds.length
        }
      });
      
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching pending refunds',
        error: error.message
      });
    }
  }
}

// Helper function for date ranges (reuse from analytics)
function getDateRange(period) {
  const now = new Date();
  let start, end = new Date();
  
  switch (period) {
    case 'daily':
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'weekly':
      start = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'monthly':
      start = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'yearly':
      start = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
  }
  
  return { start, end };
}

export default new CancellationController();