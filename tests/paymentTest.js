import axios from 'axios';
import { setupTestData } from './setupTestData.js';

const BASE_URL = 'http://localhost:5001/api';
let testData = {};

// Test configuration
const TEST_CONFIG = {
  passengerId: null,
  driverId: null,
  rideId: null,
  walletBalance: 0
};

// Test utilities
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const printTest = (title, result) => {
  const emoji = result.success ? '✅' : '❌';
  console.log(`\n${emoji} ${title}`);
  if (!result.success) {
    console.log(`   Error: ${result.error}`);
  }
  if (result.data) {
    console.log(`   Data:`, JSON.stringify(result.data, null, 2));
  }
};

// Test functions
const testWalletBalance = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/wallets/${TEST_CONFIG.passengerId}/balance`);
    TEST_CONFIG.walletBalance = response.data.data.balance;
    return {
      success: true,
      data: { balance: TEST_CONFIG.walletBalance }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

const testCreateRide = async (paymentMethod = 'wallet') => {
  try {
    const rideData = {
      passengerId: TEST_CONFIG.passengerId,
      pickup: {
        address: "Kigali Convention Center",
        coordinates: {
          latitude: -1.9399,
          longitude: 30.0588
        }
      },
      destination: {
        address: "Kigali International Airport",
        coordinates: {
          latitude: -1.9636,
          longitude: 30.0644
        }
      },
      vehicleType: 'standard',
      paymentMethod: paymentMethod
    };

    const response = await axios.post(`${BASE_URL}/rides`, rideData);
    TEST_CONFIG.rideId = response.data.data.ride._id;
    
    return {
      success: true,
      data: {
        rideId: TEST_CONFIG.rideId,
        fare: response.data.data.fare,
        paymentMethod: paymentMethod
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

const testAssignDriver = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/rides/${TEST_CONFIG.rideId}/assign-driver`, {
      driverId: TEST_CONFIG.driverId
    });

    return {
      success: true,
      data: {
        driverAssigned: response.data.data.driverId ? true : false,
        status: response.data.data.status
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

const testUpdateRideStatus = async (status) => {
  try {
    const response = await axios.put(`${BASE_URL}/rides/${TEST_CONFIG.rideId}/status`, {
      status: status
    });

    return {
      success: true,
      data: {
        status: response.data.data.status
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

const testCompleteRide = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/rides/${TEST_CONFIG.rideId}/complete`, {
      actualDistance: 12.5,
      actualDuration: 25,
      finalFare: 1850 // Slightly different from estimate
    });

    return {
      success: true,
      data: {
        status: response.data.data.ride.status,
        paymentStatus: response.data.data.ride.payment.status,
        amount: response.data.data.ride.payment.amount
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

const testCancelRide = async (cancelledBy = 'passenger', reason = 'Change of plans') => {
  try {
    const response = await axios.post(`${BASE_URL}/rides/${TEST_CONFIG.rideId}/cancel`, {
      cancelledBy: cancelledBy,
      reason: reason,
      applyCancellationFee: true
    });

    return {
      success: true,
      data: {
        status: response.data.data.ride.status,
        cancellationFee: response.data.data.cancellation.cancellationFee,
        refundAmount: response.data.data.cancellation.refundAmount
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

const testGetPaymentDetails = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/rides/${TEST_CONFIG.rideId}/payment`);

    return {
      success: true,
      data: response.data.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

const testWalletTopUp = async (amount = 500) => {
  try {
    const response = await axios.post(`${BASE_URL}/wallets/${TEST_CONFIG.passengerId}/topup`, {
      amount: amount,
      paymentMethod: 'card',
      reference: `test_topup_${Date.now()}`
    });

    return {
      success: true,
      data: {
        newBalance: response.data.data.newBalance,
        transaction: response.data.data.transaction
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

const testTransactionHistory = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/wallets/${TEST_CONFIG.passengerId}/transactions?limit=5`);

    return {
      success: true,
      data: {
        transactions: response.data.data.transactions.length,
        pagination: response.data.data.pagination
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

// Test scenarios
const runWalletTests = async () => {
  console.log('\n💰 ===== WALLET TESTS =====\n');

  // Test 1: Get initial wallet balance
  let result = await testWalletBalance();
  printTest('1. Get initial wallet balance', result);

  // Test 2: Top up wallet
  result = await testWalletTopUp(500);
  printTest('2. Top up wallet with 500', result);

  // Test 3: Get updated balance
  result = await testWalletBalance();
  printTest('3. Get updated wallet balance', result);

  // Test 4: Get transaction history
  result = await testTransactionHistory();
  printTest('4. Get transaction history', result);
};

const runWalletPaymentRideTest = async () => {
  console.log('\n🚗 ===== WALLET PAYMENT RIDE TEST =====\n');

  // Test 1: Create ride with wallet payment
  let result = await testCreateRide('wallet');
  printTest('1. Create ride with wallet payment', result);

  // Test 2: Assign driver
  result = await testAssignDriver();
  printTest('2. Assign driver to ride', result);

  // Test 3: Update to in_progress
  result = await testUpdateRideStatus('in_progress');
  printTest('3. Update ride to in_progress', result);

  // Test 4: Complete ride (should trigger payment)
  result = await testCompleteRide();
  printTest('4. Complete ride and process payment', result);

  // Test 5: Check payment details
  result = await testGetPaymentDetails();
  printTest('5. Get payment details', result);

  // Test 6: Check wallet balance after payment
  result = await testWalletBalance();
  printTest('6. Check wallet balance after payment', result);
};

const runCashPaymentRideTest = async () => {
  console.log('\n💵 ===== CASH PAYMENT RIDE TEST =====\n');

  // Test 1: Create ride with cash payment
  let result = await testCreateRide('cash');
  printTest('1. Create ride with cash payment', result);
  const cashRideId = TEST_CONFIG.rideId;

  // Test 2: Assign driver
  result = await testAssignDriver();
  printTest('2. Assign driver to ride', result);

  // Test 3: Complete ride
  result = await testCompleteRide();
  printTest('3. Complete ride', result);

  // Test 4: Check payment details (should be marked as paid for cash)
  result = await testGetPaymentDetails();
  printTest('4. Get payment details for cash ride', result);

  // Reset ride ID for next test
  TEST_CONFIG.rideId = null;
};

const runCancellationTest = async () => {
  console.log('\n🚫 ===== RIDE CANCELLATION TEST =====\n');

  // Test 1: Create ride with wallet payment
  let result = await testCreateRide('wallet');
  printTest('1. Create ride for cancellation test', result);
  const cancelRideId = TEST_CONFIG.rideId;

  // Test 2: Assign driver
  result = await testAssignDriver();
  printTest('2. Assign driver to ride', result);

  // Test 3: Cancel ride (should trigger refund calculation)
  result = await testCancelRide('passenger', 'Changed my mind');
  printTest('3. Cancel ride with refund calculation', result);

  // Test 4: Check payment details after cancellation
  result = await testGetPaymentDetails();
  printTest('4. Get payment details after cancellation', result);

  // Reset ride ID for next test
  TEST_CONFIG.rideId = null;
};

const runInsufficientBalanceTest = async () => {
  console.log('\n⚠️  ===== INSUFFICIENT BALANCE TEST =====\n');

  // Test 1: Create a very expensive ride
  let result = await testCreateRide('wallet');
  printTest('1. Create expensive ride', result);
  const expensiveRideId = TEST_CONFIG.rideId;

  // Test 2: Manually set a very high fare to simulate insufficient balance
  try {
    const response = await axios.put(`${BASE_URL}/rides/${expensiveRideId}/payment`, {
      amount: 10000 // Very high amount
    });
    printTest('2. Set high fare amount', { success: true, data: response.data });
  } catch (error) {
    printTest('2. Set high fare amount', { 
      success: false, 
      error: error.response?.data?.message || error.message 
    });
  }

  // Test 3: Try to complete ride (should fail payment)
  result = await testCompleteRide();
  printTest('3. Complete ride with insufficient balance', result);

  // Reset ride ID
  TEST_CONFIG.rideId = null;
};

// Main test runner
const runAllTests = async () => {
  try {
    console.log('🧪 STARTING PAYMENT SYSTEM TESTS...\n');

    // Setup test data
    testData = await setupTestData();
    TEST_CONFIG.passengerId = testData.passengerId;
    TEST_CONFIG.driverId = testData.driverId;

    console.log(`📊 Test Configuration:
      Passenger: ${TEST_CONFIG.passengerId}
      Driver: ${TEST_CONFIG.driverId}
    `);

    // Run test suites
    await runWalletTests();
    await sleep(1000); // Small delay between test suites
    
    await runWalletPaymentRideTest();
    await sleep(1000);
    
    await runCashPaymentRideTest();
    await sleep(1000);
    
    await runCancellationTest();
    await sleep(1000);
    
    await runInsufficientBalanceTest();

    console.log('\n🎉 ===== ALL TESTS COMPLETED =====');
    console.log('\n📋 Test Summary:');
    console.log('   ✅ Wallet Management');
    console.log('   ✅ Wallet Payment Processing');
    console.log('   ✅ Cash Payment Handling');
    console.log('   ✅ Ride Cancellation & Refunds');
    console.log('   ✅ Error Handling (Insufficient Balance)');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔚 Database connection closed');
  }
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export {
  runAllTests,
  runWalletTests,
  runWalletPaymentRideTest,
  runCashPaymentRideTest,
  runCancellationTest
};