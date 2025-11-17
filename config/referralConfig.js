const referralConfig = {
  points: {
    signup: {
      rider: 50,  // Points for referring a new rider
      driver: 100 // Points for referring a new driver
    },
    rideCompleted: {
      rider: 25,  // Points when referred rider completes a ride
      driver: 50  // Points when referred driver completes a ride
    }
  },
  rewards: {
    rideDiscounts: [
      { points: 100, discount: 20, type: 'percentage' },
      { points: 200, discount: 50, type: 'fixed' }
    ],
    cashBonus: [
      { points: 500, amount: 100 }
    ]
  },
  expiration: {
    points: 365, // Days until points expire
    codes: 90    // Days until referral codes expire
  }
};

module.exports = referralConfig;