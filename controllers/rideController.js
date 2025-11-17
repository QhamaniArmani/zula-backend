import Ride from '../models/Ride.js';
import Driver from '../models/Driver.js';
import Passenger from '../models/Passenger.js';
import DriverSubscription from '../models/DriverSubscription.js'; // 🆕 ADD SUBSCRIPTION MODEL
import pricingService from '../services/pricingService.js';
import RealtimeService from '../services/realtimeService.js';

// 🆕 Import the notification service
import notificationService from '../services/notificationService.js';

// 🆕 Use the wallet service instead
import walletService from './walletService.js';

// Initialize realtime service
let realtimeService;

export const setRealtimeService = (io) => {
  realtimeService = new RealtimeService(io);
};

// 🆕 SUBSCRIPTION CHECK HELPER FUNCTION
const checkDriverSubscription = async (driverId) => {
  try {
    const activeSubscription = await DriverSubscription.findOne({
      driver: driverId,
      status: 'active',
      endDate: { $gte: new Date() }
    });

    return {
      hasActiveSubscription: !!activeSubscription,
      subscription: activeSubscription,
      isTrial: activeSubscription?.isTrial || false
    };
  } catch (error) {
    console.error('Error checking driver subscription:', error);
    return { hasActiveSubscription: false, subscription: null, isTrial: false };
  }
};

// 🆕 SUBSCRIPTION VALIDATION FOR DRIVER ASSIGNMENT
const validateDriverForRide = async (driverId) => {
  const subscriptionCheck = await checkDriverSubscription(driverId);
  
  if (!subscriptionCheck.hasActiveSubscription) {
    return {
      valid: false,
      message: 'Driver does not have an active subscription. Please subscribe to accept rides.'
    };
  }

  return {
    valid: true,
    subscription: subscriptionCheck.subscription,
    message: 'Driver has active subscription'
  };
};

// Create new ride with real-time notifications AND push notifications
export const createRide = async (req, res) => {
  try {
    const { passengerId, pickup, destination, vehicleType, paymentMethod = 'wallet' } = req.body;

    // Validate passenger exists
    const passenger = await Passenger.findById(passengerId);
    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'Passenger not found'
      });
    }

    // Calculate fare using pricing service
    const fareDetails = await pricingService.calculateFare(
      pickup, 
      destination, 
      vehicleType
    );

    const ride = new Ride({
      passengerId,
      pickup,
      destination,
      vehicleType,
      pricing: fareDetails,
      status: 'pending',
      payment: {
        method: paymentMethod,
        status: 'pending',
        amount: fareDetails.totalFare,
        currency: fareDetails.currency || 'ZAR'
      }
    });

    await ride.save();
    await ride.populate('passengerId', 'name phone rating');

    console.log(`🚗 New ride request created: ${ride._id}`);

    // 🆕 FIND NEARBY DRIVERS WITH ACTIVE SUBSCRIPTIONS FOR PUSH NOTIFICATIONS
    const nearbyDrivers = await Driver.find({
      isAvailable: true,
      isOnline: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [
              parseFloat(pickup.location.lng),
              parseFloat(pickup.location.lat)
            ]
          },
          $maxDistance: 10000 // 10km radius
        }
      }
    }).limit(15);

    // 🆕 FILTER DRIVERS WITH ACTIVE SUBSCRIPTIONS
    const driversWithSubscriptions = [];
    for (const driver of nearbyDrivers) {
      const subscriptionCheck = await checkDriverSubscription(driver._id);
      if (subscriptionCheck.hasActiveSubscription) {
        driversWithSubscriptions.push(driver);
      }
    }

    console.log(`📍 Found ${driversWithSubscriptions.length} nearby drivers with active subscriptions for push notifications`);

    // 🆕 SEND PUSH NOTIFICATIONS TO NEARBY DRIVERS WITH SUBSCRIPTIONS
    if (driversWithSubscriptions.length > 0) {
      notificationService.sendRideRequestToDrivers(ride, driversWithSubscriptions)
        .then(success => {
          if (success) {
            console.log(`✅ Push notifications sent to ${driversWithSubscriptions.length} subscribed drivers for ride ${ride._id}`);
          } else {
            console.log(`❌ Failed to send push notifications for ride ${ride._id}`);
          }
        })
        .catch(error => {
          console.error(`❌ Error in push notifications:`, error);
        });
    }

    // Notify nearby drivers with subscriptions about new ride request via socket
    if (realtimeService) {
      driversWithSubscriptions.forEach(driver => {
        realtimeService.notifyDriverNewRide(driver._id, {
          rideId: ride._id,
          passengerId,
          pickup,
          destination,
          fare: fareDetails.totalFare,
          vehicleType,
          paymentMethod,
          requiresSubscription: true // 🆕 ADD SUBSCRIPTION FLAG
        });
      });
    }

    res.status(201).json({
      success: true,
      message: 'Ride created successfully',
      data: {
        ride,
        fare: fareDetails.totalFare,
        estimatedTime: fareDetails.time,
        payment: {
          method: paymentMethod,
          amount: fareDetails.totalFare,
          status: 'pending'
        },
        driversNotified: driversWithSubscriptions.length,
        subscriptionRequired: true // 🆕 INDICATE SUBSCRIPTION REQUIREMENT
      }
    });
  } catch (error) {
    console.error('Error creating ride:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating ride'
    });
  }
};

// Update ride status with real-time notifications, payment handling, AND push notifications
export const updateRideStatus = async (req, res) => {
  try {
    const { status, driverLocation, estimatedArrival, paymentData } = req.body;
    const allowedStatuses = ['pending', 'accepted', 'driver_en_route', 'arrived', 'in_progress', 'completed', 'cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const ride = await Ride.findById(req.params.id)
      .populate('passengerId')
      .populate('driverId');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    const oldStatus = ride.status;
    
    // Update ride status using the model method
    await ride.updateStatus(status);

    // Handle payment updates if provided
    if (paymentData) {
      await ride.updatePayment(paymentData);
    }

    // Handle payment processing when ride is completed
    if (status === 'completed' && ride.payment.amount > 0) {
      await processRidePayment(ride);
    }

    // 🆕 SEND PUSH NOTIFICATIONS FOR STATUS UPDATES
    if (ride.passengerId && ride.passengerId.fcmToken) {
      let notificationBody = '';
      
      switch(status) {
        case 'accepted':
          notificationBody = `Driver ${ride.driverId?.name || 'is on the way'} has accepted your ride`;
          break;
        case 'driver_en_route':
          notificationBody = 'Your driver is on the way to pickup location';
          break;
        case 'arrived':
          notificationBody = 'Your driver has arrived at pickup location';
          break;
        case 'in_progress':
          notificationBody = 'Your ride is in progress';
          break;
        case 'completed':
          notificationBody = 'Ride completed successfully';
          break;
        case 'cancelled':
          notificationBody = 'Ride has been cancelled';
          break;
      }

      if (notificationBody) {
        notificationService.sendRideStatusToPassenger(
          ride.passengerId._id,
          ride._id,
          status,
          notificationBody
        ).catch(error => console.error('Push notification error:', error));
      }
    }

    // Send real-time notifications
    if (realtimeService) {
      const updateData = {
        rideId: ride._id,
        status,
        driverId: ride.driverId?._id,
        passengerId: ride.passengerId?._id,
        driverLocation,
        estimatedArrival,
        payment: ride.payment,
        timestamp: new Date().toISOString()
      };

      if (ride.driverId) {
        realtimeService.notifyPassengerRideUpdate(ride.passengerId._id, updateData);
      }
      if (ride.passengerId) {
        realtimeService.sendNotification(ride.driverId._id, 'driver', {
          type: 'ride_status_update',
          rideId: ride._id,
          status,
          paymentStatus: ride.payment.status,
          message: `Ride status updated to: ${status}`
        });
      }

      if (ride.driverId && ride.passengerId) {
        req.app.get('io').emit('ride-status-update', updateData);
      }
    }

    res.json({
      success: true,
      message: 'Ride status updated successfully',
      data: ride
    });
  } catch (error) {
    console.error('Error updating ride status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ride status'
    });
  }
};

// Assign driver to ride with real-time notifications AND push notifications
export const assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // 🆕 CHECK DRIVER SUBSCRIPTION BEFORE ASSIGNMENT
    const subscriptionValidation = await validateDriverForRide(driverId);
    if (!subscriptionValidation.valid) {
      return res.status(400).json({
        success: false,
        message: subscriptionValidation.message
      });
    }

    const ride = await Ride.findByIdAndUpdate(
      req.params.id,
      { 
        driverId,
        status: 'accepted'
      },
      { new: true }
    ).populate('passengerId').populate('driverId');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    // Update driver availability
    driver.isAvailable = false;
    await driver.save();

    // 🆕 SEND PUSH NOTIFICATION TO DRIVER
    if (driver.fcmToken) {
      notificationService.sendRideAssignedToDriver(driverId, ride._id)
        .then(success => {
          if (success) {
            console.log(`✅ Push notification sent to driver ${driverId} for ride assignment`);
          }
        })
        .catch(error => {
          console.error('Error sending push notification to driver:', error);
        });
    }

    // 🆕 SEND PUSH NOTIFICATION TO PASSENGER
    if (ride.passengerId && ride.passengerId.fcmToken) {
      notificationService.sendRideStatusToPassenger(
        ride.passengerId._id,
        ride._id,
        'accepted',
        `Driver ${driver.name} has accepted your ride request`
      ).catch(error => console.error('Passenger push notification error:', error));
    }

    // Send real-time notifications
    if (realtimeService) {
      realtimeService.notifyPassengerRideUpdate(ride.passengerId._id, {
        rideId: ride._id,
        status: 'accepted',
        driverId: driver._id,
        driverName: driver.name,
        driverPhoto: driver.profilePhoto,
        vehicleType: driver.vehicleType,
        licensePlate: driver.licensePlate,
        paymentMethod: ride.payment.method,
        message: `Driver ${driver.name} has accepted your ride request`
      });

      realtimeService.sendNotification('all', 'driver', {
        type: 'ride_assigned',
        rideId: ride._id,
        message: 'Ride has been assigned to another driver'
      });
    }

    res.json({
      success: true,
      message: 'Driver assigned to ride successfully',
      data: ride,
      subscriptionInfo: { // 🆕 ADD SUBSCRIPTION INFO TO RESPONSE
        plan: subscriptionValidation.subscription?.plan,
        isTrial: subscriptionValidation.subscription?.isTrial || false
      }
    });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning driver to ride'
    });
  }
};

// 🆕 DRIVER ACCEPTS RIDE REQUEST (UPDATED WITH SUBSCRIPTION CHECK)
export const acceptRideRequest = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { driverId, driverLocation } = req.body;

    const ride = await Ride.findById(rideId).populate('passengerId');
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride request not found'
      });
    }

    if (ride.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Ride already assigned or completed'
      });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // 🆕 CHECK DRIVER SUBSCRIPTION BEFORE ACCEPTING
    const subscriptionValidation = await validateDriverForRide(driverId);
    if (!subscriptionValidation.valid) {
      return res.status(400).json({
        success: false,
        message: subscriptionValidation.message
      });
    }

    // Update ride with driver info
    ride.driverId = driverId;
    ride.status = 'accepted';
    ride.driverLocation = driverLocation;
    ride.acceptedAt = new Date();
    ride.estimatedArrival = await calculateArrivalTime(
      driverLocation,
      ride.pickup.location
    );

    await ride.save();

    // Update driver availability
    driver.isAvailable = false;
    await driver.save();

    console.log(`✅ Ride ${rideId} accepted by driver ${driverId} with active subscription`);

    // 🆕 NOTIFY PASSENGER VIA PUSH NOTIFICATION
    if (ride.passengerId && ride.passengerId.fcmToken) {
      notificationService.sendRideStatusToPassenger(
        ride.passengerId._id,
        rideId,
        'accepted',
        `${driver.name} is on the way to pickup location`
      ).catch(error => console.error('Push notification error:', error));
    }

    res.json({
      success: true,
      data: ride,
      message: 'Ride request accepted successfully',
      subscriptionInfo: { // 🆕 ADD SUBSCRIPTION INFO
        plan: subscriptionValidation.subscription?.plan,
        isTrial: subscriptionValidation.subscription?.isTrial || false
      }
    });

  } catch (error) {
    console.error('❌ Error accepting ride request:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting ride request',
      error: error.message
    });
  }
};

// 🆕 DRIVER DECLINES RIDE REQUEST (New endpoint for push notification flow)
export const declineRideRequest = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { driverId } = req.body;

    console.log(`Driver ${driverId} declined ride ${rideId}`);

    // You can implement logic to find another driver here
    // For now, just log the decline

    res.json({
      success: true,
      message: 'Ride request declined'
    });

  } catch (error) {
    console.error('Error declining ride request:', error);
    res.status(500).json({
      success: false,
      message: 'Error declining ride request',
      error: error.message
    });
  }
};

// 🆕 Helper function to calculate estimated arrival time
async function calculateArrivalTime(driverLocation, pickupLocation) {
  // Simple calculation - you can integrate with Google Maps API later
  const estimatedMinutes = Math.floor(Math.random() * 10) + 5; // 5-15 minutes
  const arrivalTime = new Date();
  arrivalTime.setMinutes(arrivalTime.getMinutes() + estimatedMinutes);
  return arrivalTime;
}

// 🆕 PAYMENT-RELATED CONTROLLER METHODS

// Process ride payment when ride is completed - UPDATED FOR SUBSCRIPTION MODEL
const processRidePayment = async (ride) => {
  try {
    if (ride.payment.status === 'paid') {
      return; // Already paid
    }

    const paymentMethod = ride.payment.method;
    const amount = ride.payment.amount;

    if (paymentMethod === 'wallet') {
      const paymentResult = await processWalletPayment(ride.passengerId._id, ride._id, amount);
      
      if (paymentResult.success) {
        await ride.confirmPayment({
          transactionId: paymentResult.transactionId,
          receiptNumber: `RCPT-${ride._id.toString().slice(-8).toUpperCase()}`
        });
      } else {
        await ride.failPayment(paymentResult.message);
      }
    } else if (paymentMethod === 'card' || paymentMethod === 'mobile_money') {
      const gatewayResult = await processGatewayPayment(ride, paymentMethod);
      
      if (gatewayResult.success) {
        await ride.confirmPayment({
          transactionId: gatewayResult.transactionId,
          receiptNumber: gatewayResult.receiptNumber,
          gateway: gatewayResult.gatewayData
        });
      } else {
        await ride.failPayment(gatewayResult.message);
      }
    } else if (paymentMethod === 'cash') {
      await ride.confirmPayment({
        receiptNumber: `CASH-${ride._id.toString().slice(-8).toUpperCase()}`
      });
    }

    // 🆕 SEND PAYMENT NOTIFICATION VIA PUSH
    if (ride.passengerId && ride.passengerId.fcmToken) {
      notificationService.sendRideStatusToPassenger(
        ride.passengerId._id,
        ride._id,
        'completed',
        `Payment of ${ride.payment.amount} ${ride.payment.currency} ${ride.payment.status === 'paid' ? 'completed' : 'failed'}`
      ).catch(error => console.error('Payment push notification error:', error));
    }

    // 🆕 UPDATE DRIVER EARNINGS WITH 100% OF FARE (SUBSCRIPTION MODEL)
    if (ride.driverId && ride.payment.status === 'paid') {
      await updateDriverEarnings(ride.driverId._id, amount, ride._id);
    }

    // Send payment notification via socket
    if (realtimeService) {
      realtimeService.sendNotification(ride.passengerId._id, 'passenger', {
        type: 'payment_processed',
        rideId: ride._id,
        amount: ride.payment.amount,
        status: ride.payment.status,
        method: ride.payment.method,
        message: `Payment of ${ride.payment.amount} ${ride.payment.currency} ${ride.payment.status === 'paid' ? 'completed' : 'failed'}`
      });
    }

  } catch (error) {
    console.error('Error processing ride payment:', error);
    await ride.failPayment('Payment processing error');
  }
};

// 🆕 UPDATE DRIVER EARNINGS WITH 100% OF FARE
const updateDriverEarnings = async (driverId, amount, rideId) => {
  try {
    const driver = await Driver.findById(driverId);
    if (driver) {
      driver.totalEarnings += amount;
      driver.stats.completedRides += 1;
      await driver.save();

      console.log(`💰 Driver ${driverId} earned 100% of fare: R${amount} for ride ${rideId}`);
      
      // 🆕 SEND EARNINGS NOTIFICATION TO DRIVER
      if (driver.fcmToken) {
        notificationService.sendRideStatusToDriver(
          driverId,
          rideId,
          'earnings_updated',
          `You earned R${amount} (100% of fare) for ride completion`
        ).catch(error => console.error('Earnings push notification error:', error));
      }
    }
  } catch (error) {
    console.error('Error updating driver earnings:', error);
  }
};

// Process wallet payment - UPDATED: Use walletService directly
const processWalletPayment = async (passengerId, rideId, amount) => {
  try {
    // 🆕 FIXED: Use walletService directly
    const result = await walletService.deductFromWallet(
      passengerId, 
      amount, 
      rideId, 
      `Ride payment for ${rideId}`
    );

    return {
      success: result.success,
      transactionId: result.data?.transaction?._id || `WALLET-${Date.now()}`,
      message: result.message
    };
  } catch (error) {
    console.error('Wallet payment error:', error);
    return {
      success: false,
      message: error.message || 'Wallet payment failed'
    };
  }
};

// Process external gateway payment
const processGatewayPayment = async (ride, paymentMethod) => {
  try {
    console.log(`Processing ${paymentMethod} payment for ride ${ride._id}`);
    
    const isSuccess = Math.random() > 0.1;
    
    if (isSuccess) {
      return {
        success: true,
        transactionId: `GTW-${Date.now()}-${ride._id.toString().slice(-6)}`,
        receiptNumber: `RCPT-${ride._id.toString().slice(-8).toUpperCase()}`,
        gatewayData: {
          name: paymentMethod === 'card' ? 'stripe' : 'mobile_gateway',
          transactionId: `GTW-${Date.now()}`,
          paymentIntentId: `pi_${ride._id.toString().slice(-8)}`
        },
        message: 'Payment processed successfully'
      };
    } else {
      return {
        success: false,
        message: 'Payment gateway declined the transaction'
      };
    }
  } catch (error) {
    console.error('Gateway payment error:', error);
    return {
      success: false,
      message: 'Payment gateway error'
    };
  }
};

// 🆕 Complete ride and process payment
export const completeRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { actualDistance, actualDuration, finalFare } = req.body;

    const ride = await Ride.findById(rideId)
      .populate('passengerId')
      .populate('driverId');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    if (ride.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Ride is not in progress'
      });
    }

    // Update ride metrics
    ride.actualDistance = actualDistance || ride.actualDistance;
    ride.actualDuration = actualDuration || ride.actualDuration;
    
    if (finalFare && finalFare !== ride.pricing.totalFare) {
      ride.pricing.totalFare = finalFare;
      ride.payment.amount = finalFare;
    }

    await ride.updateStatus('completed');
    await processRidePayment(ride);

    if (ride.driverId) {
      await Driver.findByIdAndUpdate(ride.driverId._id, { isAvailable: true });
    }

    // 🆕 SEND COMPLETION PUSH NOTIFICATIONS
    if (ride.passengerId && ride.passengerId.fcmToken) {
      notificationService.sendRideStatusToPassenger(
        ride.passengerId._id,
        ride._id,
        'completed',
        'Ride completed successfully. Thank you for using ZulaRides!'
      ).catch(error => console.error('Completion push notification error:', error));
    }

    if (realtimeService) {
      realtimeService.notifyPassengerRideUpdate(ride.passengerId._id, {
        rideId: ride._id,
        status: 'completed',
        payment: ride.payment,
        message: 'Ride completed successfully'
      });

      realtimeService.sendNotification(ride.driverId._id, 'driver', {
        type: 'ride_completed',
        rideId: ride._id,
        amount: ride.payment.amount,
        paymentStatus: ride.payment.status,
        message: 'Ride completed - payment processed'
      });
    }

    res.json({
      success: true,
      message: 'Ride completed successfully',
      data: {
        ride,
        payment: ride.payment,
        driverEarnings: { // 🆕 ADD DRIVER EARNINGS INFO
          amount: ride.payment.amount,
          percentage: '100%',
          note: 'Driver keeps 100% of fare (subscription model)'
        }
      }
    });
  } catch (error) {
    console.error('Error completing ride:', error);
    res.status(500).json({
      success: false,
      message: 'Error completing ride'
    });
  }
};

// 🆕 Cancel ride with refund handling
export const cancelRide = async (req, res) => {
  try {
    const { rideId } = req.params;
    const { cancelledBy, reason, applyCancellationFee = true } = req.body;

    const ride = await Ride.findById(rideId)
      .populate('passengerId')
      .populate('driverId');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    if (ride.status === 'completed' || ride.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Ride is already ${ride.status}`
      });
    }

    const cancellationDetails = calculateCancellationFee(ride, cancelledBy, applyCancellationFee);
    
    await ride.cancelRide(
      cancelledBy,
      reason,
      cancellationDetails.cancellationFee,
      cancellationDetails.refundAmount
    );

    if (cancellationDetails.refundAmount > 0 && ride.payment.status === 'paid') {
      await processRideRefund(ride, cancellationDetails.refundAmount, reason);
    }

    if (ride.driverId && ride.driverId.isAvailable === false) {
      await Driver.findByIdAndUpdate(ride.driverId._id, { isAvailable: true });
    }

    // 🆕 SEND CANCELLATION PUSH NOTIFICATIONS
    if (ride.passengerId && ride.passengerId.fcmToken) {
      notificationService.sendRideStatusToPassenger(
        ride.passengerId._id,
        ride._id,
        'cancelled',
        `Ride cancelled by ${cancelledBy}. ${cancellationDetails.refundAmount > 0 ? `Refund of ${cancellationDetails.refundAmount} ${ride.payment.currency} processed.` : ''}`
      ).catch(error => console.error('Cancellation push notification error:', error));
    }

    if (realtimeService) {
      const notificationData = {
        rideId: ride._id,
        cancelledBy,
        reason,
        cancellationFee: cancellationDetails.cancellationFee,
        refundAmount: cancellationDetails.refundAmount,
        message: `Ride cancelled by ${cancelledBy}`
      };

      if (ride.passengerId) {
        realtimeService.notifyPassengerRideUpdate(ride.passengerId._id, notificationData);
      }
      if (ride.driverId) {
        realtimeService.sendNotification(ride.driverId._id, 'driver', {
          type: 'ride_cancelled',
          ...notificationData
        });
      }
    }

    res.json({
      success: true,
      message: 'Ride cancelled successfully',
      data: {
        ride,
        cancellation: ride.cancellation,
        refund: cancellationDetails.refundAmount > 0 ? {
          amount: cancellationDetails.refundAmount,
          status: ride.cancellation.isRefundProcessed ? 'processed' : 'pending'
        } : null
      }
    });
  } catch (error) {
    console.error('Error cancelling ride:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling ride'
    });
  }
};

// Calculate cancellation fee
const calculateCancellationFee = (ride, cancelledBy, applyCancellationFee) => {
  let cancellationFee = 0;
  let refundAmount = 0;

  const paidAmount = ride.payment.status === 'paid' ? ride.payment.amount : 0;

  const isFreeCancellation = 
    ride.isFreeCancellation || 
    cancelledBy === 'driver' || 
    !applyCancellationFee;

  if (isFreeCancellation) {
    cancellationFee = 0;
    refundAmount = paidAmount;
  } else {
    if (ride.status === 'accepted' || ride.status === 'driver_en_route') {
      cancellationFee = Math.min(paidAmount * 0.1, 50);
    } else if (ride.status === 'arrived') {
      cancellationFee = Math.min(paidAmount * 0.2, 100);
    } else {
      cancellationFee = 0;
    }
    refundAmount = Math.max(0, paidAmount - cancellationFee);
  }

  return { cancellationFee, refundAmount };
};

// Process ride refund - UPDATED: Use walletService directly
const processRideRefund = async (ride, refundAmount, reason) => {
  try {
    if (ride.payment.method === 'wallet') {
      // 🆕 FIXED: Use walletService directly
      await walletService.refundToWallet(
        ride.passengerId._id,
        refundAmount,
        `Ride cancellation: ${reason}`,
        `refund_${ride._id}`
      );
    } else if (ride.payment.method === 'card' || ride.payment.method === 'mobile_money') {
      await processGatewayRefund(ride, refundAmount);
    }

    await ride.processRefund(
      `REF-${Date.now()}-${ride._id.toString().slice(-6)}`,
      `GTW-REF-${Date.now()}`
    );

    // 🆕 SEND REFUND PUSH NOTIFICATION
    if (ride.passengerId && ride.passengerId.fcmToken) {
      notificationService.sendRideStatusToPassenger(
        ride.passengerId._id,
        ride._id,
        'refund_processed',
        `Refund of ${refundAmount} ${ride.payment.currency} processed for cancelled ride`
      ).catch(error => console.error('Refund push notification error:', error));
    }

    if (realtimeService) {
      realtimeService.sendNotification(ride.passengerId._id, 'passenger', {
        type: 'refund_processed',
        rideId: ride._id,
        amount: refundAmount,
        message: `Refund of ${refundAmount} ${ride.payment.currency} processed for cancelled ride`
      });
    }

  } catch (error) {
    console.error('Error processing refund:', error);
    throw new Error('Refund processing failed');
  }
};

// Process gateway refund
const processGatewayRefund = async (ride, refundAmount) => {
  console.log(`Processing ${refundAmount} refund for ride ${ride._id} via ${ride.payment.method}`);
  return { success: true, transactionId: `REF-${Date.now()}` };
};

// 🆕 Get ride payment details
export const getRidePayment = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id)
      .select('payment pricing cancellation status passengerId driverId')
      .populate('passengerId', 'name email')
      .populate('driverId', 'name email');

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    res.json({
      success: true,
      data: {
        payment: ride.payment,
        pricing: ride.pricing,
        cancellation: ride.cancellation,
        status: ride.status,
        passenger: ride.passengerId,
        driver: ride.driverId,
        earningsModel: 'subscription' // 🆕 INDICATE SUBSCRIPTION MODEL
      }
    });
  } catch (error) {
    console.error('Error getting ride payment:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving payment details'
    });
  }
};

// 🆕 Update payment method for a ride
export const updatePaymentMethod = async (req, res) => {
  try {
    const { paymentMethod } = req.body;

    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: 'Ride not found'
      });
    }

    if (ride.status !== 'pending' && ride.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change payment method after ride has started'
      });
    }

    await ride.updatePayment({ method: paymentMethod });

    res.json({
      success: true,
      message: 'Payment method updated successfully',
      data: {
        payment: ride.payment
      }
    });
  } catch (error) {
    console.error('Error updating payment method:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment method'
    });
  }
};

// 🆕 GET DRIVER SUBSCRIPTION STATUS FOR RIDE
export const getDriverSubscriptionStatus = async (req, res) => {
  try {
    const { driverId } = req.params;

    const subscriptionCheck = await checkDriverSubscription(driverId);

    res.json({
      success: true,
      data: {
        hasActiveSubscription: subscriptionCheck.hasActiveSubscription,
        subscription: subscriptionCheck.subscription,
        canAcceptRides: subscriptionCheck.hasActiveSubscription,
        message: subscriptionCheck.hasActiveSubscription 
          ? 'Driver has active subscription' 
          : 'Driver needs active subscription to accept rides'
      }
    });
  } catch (error) {
    console.error('Error checking driver subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking subscription status'
    });
  }
};