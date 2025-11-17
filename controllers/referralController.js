const { ReferralCode, ReferralActivity, ReferralReward } = require('../models/Referral');
const User = require('../models/User');
const referralConfig = require('../config/referralConfig');

class ReferralController {
  // Generate referral code for user
  async generateReferralCode(req, res) {
    try {
      const { type } = req.body;
      const userId = req.user.id;

      // Check if user already has an active referral code for this type
      const existingCode = await ReferralCode.findOne({
        user: userId,
        type,
        isActive: true
      });

      if (existingCode) {
        return res.json({
          success: true,
          code: existingCode.code,
          message: 'Referral code already exists'
        });
      }

      // Generate unique referral code
      const code = await this.generateUniqueCode();

      const referralCode = new ReferralCode({
        user: userId,
        code,
        type
      });

      await referralCode.save();

      // Initialize referral rewards if not exists
      await this.initializeUserRewards(userId);

      res.json({
        success: true,
        code,
        message: 'Referral code generated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error generating referral code'
      });
    }
  }

  // Get user's referral information
  async getUserReferralInfo(req, res) {
    try {
      const userId = req.user.id;

      const [codes, activities, rewards] = await Promise.all([
        ReferralCode.find({ user: userId }),
        ReferralActivity.find({ referrer: userId }).populate('referee', 'name email'),
        ReferralReward.findOne({ user: userId })
      ]);

      const stats = {
        totalReferrals: codes.reduce((sum, code) => sum + code.referralCount, 0),
        completedRides: codes.reduce((sum, code) => sum + code.completedRidesCount, 0),
        totalPoints: rewards ? rewards.points : 0,
        availablePoints: rewards ? rewards.availablePoints : 0
      };

      res.json({
        success: true,
        codes,
        activities,
        rewards,
        stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching referral information'
      });
    }
  }

  // Process referral signup
  async processReferralSignup(refereeId, referralCode) {
    try {
      const code = await ReferralCode.findOne({ code: referralCode.toUpperCase() });
      if (!code || !code.isActive) {
        return false;
      }

      // Create referral activity
      const activity = new ReferralActivity({
        referrer: code.user,
        referee: refereeId,
        referralCode: code.code,
        activityType: 'signup',
        pointsAwarded: referralConfig.points.signup[code.type],
        status: 'completed'
      });

      await activity.save();

      // Update referral code stats
      code.referralCount += 1;
      code.points += referralConfig.points.signup[code.type];
      await code.save();

      // Update user rewards
      await this.updateUserRewards(code.user, referralConfig.points.signup[code.type]);

      // Send notification to referrer
      await this.sendReferralNotification(code.user, 'signup');

      return true;
    } catch (error) {
      console.error('Error processing referral signup:', error);
      return false;
    }
  }

  // Process ride completion for referral points
  async processRideCompletion(rideId, userId) {
    try {
      // Find if user was referred
      const referralActivity = await ReferralActivity.findOne({
        referee: userId,
        activityType: 'signup',
        status: 'completed'
      });

      if (!referralActivity) return;

      const code = await ReferralCode.findOne({ code: referralActivity.referralCode });
      if (!code) return;

      // Create ride completion activity
      const rideActivity = new ReferralActivity({
        referrer: referralActivity.referrer,
        referee: userId,
        referralCode: code.code,
        activityType: 'ride_completed',
        pointsAwarded: referralConfig.points.rideCompleted[code.type],
        ride: rideId,
        status: 'completed'
      });

      await rideActivity.save();

      // Update referral code stats
      code.completedRidesCount += 1;
      code.points += referralConfig.points.rideCompleted[code.type];
      await code.save();

      // Update user rewards
      await this.updateUserRewards(code.user, referralConfig.points.rideCompleted[code.type]);

      // Send notification to referrer
      await this.sendReferralNotification(code.user, 'ride_completed');
    } catch (error) {
      console.error('Error processing ride completion referral:', error);
    }
  }

  // Helper methods
  async generateUniqueCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let isUnique = false;

    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      const existing = await ReferralCode.findOne({ code });
      if (!existing) isUnique = true;
    }

    return code;
  }

  async initializeUserRewards(userId) {
    const existing = await ReferralReward.findOne({ user: userId });
    if (!existing) {
      const rewards = new ReferralReward({ user: userId });
      await rewards.save();
    }
  }

  async updateUserRewards(userId, points) {
    await ReferralReward.findOneAndUpdate(
      { user: userId },
      {
        $inc: {
          points: points,
          availablePoints: points
        }
      }
    );
  }

  async sendReferralNotification(userId, type) {
    // Implementation for sending push notifications
    const messages = {
      signup: {
        en: 'Your friend joined ZulaRides using your referral! You earned 50 points.',
        zu: 'Umngane wakho ujoyine i-ZulaRides usebenzisa isazisi sakho! Uthole amaphuzu angu-50.',
        xh: 'Umhlobo wakho ujoyine i-ZulaRides esebenzisa ireferral yakho! Ufumene amaphuzu angama-50.',
        af: 'Jou vriend het ZulaRides aangesluit met jou verwysing! Jy het 50 punte verdien.'
      },
      ride_completed: {
        en: 'Your referral completed a ride! You earned 25 points.',
        zu: 'Isazisi sakho siphele ukuhamba! Uthole amaphuzu angu-25.',
        xh: 'Ireferral yakho igqibile i-ride! Ufumene amaphuzu angama-25.',
        af: 'Jou verwysing het \'n rit voltooi! Jy het 25 punte verdien.'
      }
    };

    // Send push notification using your existing FCM service
    // await pushNotificationService.sendNotification(userId, messages[type]);
  }
}

module.exports = new ReferralController();