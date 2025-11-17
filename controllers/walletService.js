// Wallet service that uses HTTP calls to avoid import issues
import axios from 'axios';

const BASE_URL = 'http://localhost:5002/api';

class WalletService {
  async getWalletBalance(userId) {
    try {
      const response = await axios.get(`${BASE_URL}/wallets/${userId}/balance`);
      return response.data;
    } catch (error) {
      console.error('Get wallet balance error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get wallet balance'
      };
    }
  }

  async topUpWallet(userId, amount, paymentMethod, reference) {
    try {
      const response = await axios.post(`${BASE_URL}/wallets/${userId}/topup`, {
        amount,
        paymentMethod,
        reference
      });
      return response.data;
    } catch (error) {
      console.error('Top up wallet error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Top up failed'
      };
    }
  }

  async deductFromWallet(userId, amount, rideId, description) {
    try {
      const response = await axios.post(`${BASE_URL}/wallets/${userId}/deduct`, {
        amount,
        rideId,
        description
      });
      return response.data;
    } catch (error) {
      console.error('Deduct from wallet error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Deduction failed'
      };
    }
  }

  async refundToWallet(userId, amount, reason, reference) {
    try {
      const response = await axios.post(`${BASE_URL}/wallets/${userId}/refund`, {
        amount,
        reason,
        reference
      });
      return response.data;
    } catch (error) {
      console.error('Refund to wallet error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Refund failed'
      };
    }
  }

  async getTransactionHistory(userId, page = 1, limit = 10) {
    try {
      const response = await axios.get(`${BASE_URL}/wallets/${userId}/transactions?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Get transaction history error:', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to get transaction history'
      };
    }
  }
}

export default new WalletService();