import Subscription from '../models/Subscription.js';
import Driver from '../models/Driver.js';
import DriverSubscription from '../models/DriverSubscription.js'; // 🆕 ADD DRIVER SUBSCRIPTION MODEL
import { subscriptionPlans, freeTrial } from '../config/subscriptionPlans.js'; // 🆕 ADD SUBSCRIPTION CONFIG

// 🆕 SUBSCRIPTION PLANS CONFIGURATION
const SUBSCRIPTION_PLANS = {
  basic: {
    name: 'Basic',
    price: 299, // R299 per month
    duration: 30, // days
    features: {
      unlimitedRides: true,
      keep100Percent: true,
      basicSupport: true,
      weeklyPayouts: true,
      rideInsurance: false,
      prioritySupport: false,
      advancedAnalytics: false
    },
    description: {
      en: 'Perfect for part-time drivers',
      zu: 'Ilungele abashayeli abasebenza isikhathi esingaphelele',
      xh: 'Ilungele abaghubi abasebenza ngexesha elingaphelelanga',
      af: 'Perfek vir deeltyd bestuurders'
    }
  },
  premium: {
    name: 'Premium',
    price: 599, // R599 per month
    duration: 30,
    features: {
      unlimitedRides: true,
      keep100Percent: true,
      prioritySupport: true,
      dailyPayouts: true,
      rideInsurance: true,
      advancedAnalytics: true,
      driverRewards: true
    },
    description: {
      en: 'For full-time professional drivers',
      zu: 'Kubashayeli abasebenza isikhathi esigcwele',
      xh: 'Kubaghubi abasebenza ngexesha elipheleleyo',
      af: 'Vir voltydse professionele bestuurders'
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 999, // R999 per month
    duration: 30,
    features: {
      unlimitedRides: true,
      keep100Percent: true,
      prioritySupport: true,
      instantPayouts: true,
      premiumInsurance: true,
      advancedAnalytics: true,
      multipleVehicles: true,
      dedicatedAccountManager: true
    },
    description: {
      en: 'For fleet owners and professional services',
      zu: 'Kabanikazi bemifula nangezinsizakalo zobuchwepheshe',
      xh: 'Kabanini-befleet kunye neenkonzo zobugcisa',
      af: 'Vir vlooteienaars en professionele dienste'
    }
  }
};

// 🆕 FREE TRIAL CONFIGURATION
const FREE_TRIAL = {
  enabled: true,
  duration: 7, // 7 days free trial
  rideLimit: 10, // Maximum 10 rides during trial
  features: SUBSCRIPTION_PLANS.basic.features
};

// Get all subscriptions
export const getSubscriptions = async (req, res) => {
  try {
    const subscriptions = await Subscription.find();
    res.json({
      success: true,
      data: subscriptions
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscriptions'
    });
  }
};

// Get subscription by ID
export const getSubscriptionById = async (req, res) => {
  try {
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription'
    });
  }
};

// Create new subscription
export const createSubscription = async (req, res) => {
  try {
    const subscription = new Subscription(req.body);
    await subscription.save();

    res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating subscription'
    });
  }
};

// Update subscription
export const updateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: subscription
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating subscription'
    });
  }
};

// Assign subscription to driver
export const assignSubscriptionToDriver = async (req, res) => {
  try {
    const { driverId } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const subscription = await Subscription.findById(req.params.id);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    driver.subscription = req.params.id;
    await driver.save();

    res.json({
      success: true,
      message: 'Subscription assigned to driver successfully',
      data: driver
    });
  } catch (error) {
    console.error('Error assigning subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning subscription to driver'
    });
  }
};

// 🆕 GET AVAILABLE SUBSCRIPTION PLANS
export const getSubscriptionPlans = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        plans: SUBSCRIPTION_PLANS,
        freeTrial: FREE_TRIAL,
        businessModel: 'driver_subscription', // 🆕 INDICATE BUSINESS MODEL
        description: 'Drivers keep 100% of ride fares with monthly subscription'
      }
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription plans'
    });
  }
};

// 🆕 SUBSCRIBE DRIVER TO PLAN
export const subscribeDriverToPlan = async (req, res) => {
  try {
    const { driverId, plan, paymentMethod, useTrial = false } = req.body;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Check if driver already has active subscription
    const activeSubscription = await DriverSubscription.findOne({
      driver: driverId,
      status: 'active',
      endDate: { $gte: new Date() }
    });

    if (activeSubscription && !useTrial) {
      return res.status(400).json({
        success: false,
        message: 'Driver already has an active subscription'
      });
    }

    let subscriptionData = {
      driver: driverId,
      plan: plan,
      paymentMethod: paymentMethod,
      startDate: new Date()
    };

    if (useTrial && await isEligibleForTrial(driverId)) {
      // Free trial subscription
      subscriptionData.price = 0;
      subscriptionData.endDate = new Date(Date.now() + FREE_TRIAL.duration * 24 * 60 * 60 * 1000);
      subscriptionData.status = 'active';
      subscriptionData.paymentStatus = 'paid';
      subscriptionData.features = FREE_TRIAL.features;
      subscriptionData.isTrial = true;
      subscriptionData.trialRidesRemaining = FREE_TRIAL.rideLimit;
    } else {
      // Paid subscription
      const selectedPlan = SUBSCRIPTION_PLANS[plan];
      if (!selectedPlan) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subscription plan'
        });
      }

      subscriptionData.price = selectedPlan.price;
      subscriptionData.endDate = new Date(Date.now() + selectedPlan.duration * 24 * 60 * 60 * 1000);
      subscriptionData.status = 'active';
      subscriptionData.paymentStatus = 'paid'; // Assuming payment processed
      subscriptionData.features = selectedPlan.features;
    }

    const driverSubscription = new DriverSubscription(subscriptionData);
    await driverSubscription.save();

    // Update driver subscription status
    driver.subscriptionStatus = 'active';
    driver.currentSubscription = driverSubscription._id;
    await driver.save();

    res.json({
      success: true,
      message: useTrial ? 'Free trial activated successfully!' : 'Subscription activated successfully!',
      data: {
        subscription: driverSubscription,
        nextBillingDate: driverSubscription.endDate,
        canAcceptRides: true
      }
    });

  } catch (error) {
    console.error('Error subscribing driver:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing subscription'
    });
  }
};

// 🆕 GET DRIVER SUBSCRIPTION STATUS
export const getDriverSubscriptionStatus = async (req, res) => {
  try {
    const { driverId } = req.params;

    const activeSubscription = await DriverSubscription.findOne({
      driver: driverId,
      status: 'active',
      endDate: { $gte: new Date() }
    });

    const subscriptionHistory = await DriverSubscription.find({
      driver: driverId
    }).sort({ createdAt: -1 });

    const driver = await Driver.findById(driverId);

    res.json({
      success: true,
      data: {
        hasActiveSubscription: !!activeSubscription,
        activeSubscription,
        subscriptionHistory,
        driverStatus: driver?.subscriptionStatus || 'inactive',
        trialEligible: await isEligibleForTrial(driverId),
        canAcceptRides: !!activeSubscription
      }
    });

  } catch (error) {
    console.error('Error fetching driver subscription status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription status'
    });
  }
};

// 🆕 CANCEL DRIVER SUBSCRIPTION
export const cancelDriverSubscription = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { reason } = req.body;

    const activeSubscription = await DriverSubscription.findOne({
      driver: driverId,
      status: 'active'
    });

    if (!activeSubscription) {
      return res.status(400).json({
        success: false,
        message: 'No active subscription found'
      });
    }

    // Allow cancellation but keep active until end date
    activeSubscription.autoRenew = false;
    activeSubscription.status = 'cancelled';
    activeSubscription.cancellationReason = reason;
    await activeSubscription.save();

    // Update driver status but don't immediately disable
    const driver = await Driver.findById(driverId);
    if (driver) {
      driver.subscriptionStatus = 'cancelled';
      await driver.save();
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully. You can continue driving until your subscription end date.',
      data: {
        endDate: activeSubscription.endDate,
        canAcceptRidesUntil: activeSubscription.endDate
      }
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling subscription'
    });
  }
};

// 🆕 CHECK TRIAL ELIGIBILITY
const isEligibleForTrial = async (driverId) => {
  if (!FREE_TRIAL.enabled) return false;

  // Check if driver has used trial before
  const previousTrial = await DriverSubscription.findOne({
    driver: driverId,
    isTrial: true
  });

  return !previousTrial;
};

// 🆕 GET SUBSCRIPTION ANALYTICS
export const getSubscriptionAnalytics = async (req, res) => {
  try {
    const totalSubscriptions = await DriverSubscription.countDocuments();
    const activeSubscriptions = await DriverSubscription.countDocuments({
      status: 'active',
      endDate: { $gte: new Date() }
    });
    const trialSubscriptions = await DriverSubscription.countDocuments({
      isTrial: true,
      status: 'active'
    });

    // Revenue calculations
    const paidSubscriptions = await DriverSubscription.find({
      isTrial: false,
      status: 'active'
    });
    const monthlyRevenue = paidSubscriptions.reduce((total, sub) => total + sub.price, 0);

    // Plan distribution
    const planDistribution = await DriverSubscription.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          revenue: { $sum: '$price' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalSubscriptions,
        activeSubscriptions,
        trialSubscriptions,
        monthlyRevenue,
        planDistribution,
        analytics: {
          activeRate: totalSubscriptions > 0 ? (activeSubscriptions / totalSubscriptions) * 100 : 0,
          trialConversionRate: trialSubscriptions > 0 ? ((totalSubscriptions - trialSubscriptions) / trialSubscriptions) * 100 : 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching subscription analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription analytics'
    });
  }
};