const subscriptionPlans = {
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

// Free trial configuration
const freeTrial = {
  enabled: true,
  duration: 7, // 7 days free trial
  rideLimit: 10, // Maximum 10 rides during trial
  features: subscriptionPlans.basic.features
};

module.exports = {
  subscriptionPlans,
  freeTrial
};