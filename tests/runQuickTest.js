import { runWalletPaymentRideTest } from './paymentTest.js';
import { setupTestData } from './setupTestData.js';

const runQuickTest = async () => {
  try {
    console.log('🚀 Running Quick Wallet Payment Test...\n');
    
    const testData = await setupTestData();
    global.TEST_CONFIG = {
      passengerId: testData.passengerId,
      driverId: testData.driverId,
      rideId: null,
      walletBalance: 0
    };

    await runWalletPaymentRideTest();
    
    console.log('\n✅ Quick test completed!');
    
  } catch (error) {
    console.error('❌ Quick test failed:', error);
  }
};

runQuickTest();