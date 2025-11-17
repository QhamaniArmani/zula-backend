import api from './api';

export interface ReferralStats {
  totalReferrals: number;
  completedRides: number;
  totalPoints: number;
  availablePoints: number;
}

export interface ReferralCode {
  _id: string;
  code: string;
  type: 'rider' | 'driver';
  points: number;
  referralCount: number;
  completedRidesCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface ReferralActivity {
  _id: string;
  referee: {
    name: string;
    email: string;
  };
  activityType: 'signup' | 'ride_completed';
  pointsAwarded: number;
  status: string;
  createdAt: string;
}

class ReferralService {
  async generateReferralCode(type: 'rider' | 'driver'): Promise<{ code: string }> {
    const response = await api.post('/referrals/generate-code', { type });
    return response.data;
  }

  async getReferralInfo(): Promise<{
    codes: ReferralCode[];
    activities: ReferralActivity[];
    stats: ReferralStats;
  }> {
    const response = await api.get('/referrals/my-referrals');
    return response.data;
  }

  async shareReferral(code: string, message?: string): Promise<void> {
    const shareUrl = `https://zularides.co.za/signup?ref=${code}`;
    const shareMessage = message || 
      `Join me on ZulaRides! Use my code ${code} for signup bonus. Download the app: ${shareUrl}`;

    // Use React Native Share API
    if (navigator.share) {
      await navigator.share({
        title: 'Join ZulaRides',
        text: shareMessage,
        url: shareUrl,
      });
    } else {
      // Fallback for devices without Web Share API
      // Copy to clipboard or show share options
    }
  }

  async validateReferralCode(code: string): Promise<boolean> {
    try {
      const response = await api.get(`/referrals/validate/${code}`);
      return response.data.valid;
    } catch (error) {
      return false;
    }
  }
}

export default new ReferralService();