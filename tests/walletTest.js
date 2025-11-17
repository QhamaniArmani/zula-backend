import axios from 'axios';

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
const testHealthCheck = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};

const testGetUsers = async () => {
  try {
    // Try to get some existing users to use for testing
    const passengers = await axios.get(`${BASE_URL}/passengers?limit=1`);
    const drivers = await axios.get(`${BASE_URL}/drivers?limit=1`);
    
    let passengerId = TEST_CONFIG.passengerId;
    let driverId = TEST_CONFIG.driverId;
    
    if (passengers.data.data && passengers.data.data.length > 0) {
      passengerId = passengers.data.data[0]._id;
    }
    if (drivers.data.data && drivers.data.data.length > 0) {
      driverId = drivers.data.data[0]._id;
    }
    
    TEST_CONFIG.passengerId = passengerId;
    TEST_CONFIG.driverId = driverId;
    
    return {
      success: true,
      data: {
        passengerId,
        driverId
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data?.message || error.message
    };
  }
};

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
      finalFare: 1850
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
        newBalance: response.data.data.newBalance
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

// Test scenarios
const runBasicConnectionTest = async () => {
  console.log('\n🔌 ===== BASIC CONNECTION TEST =====\n');

  // Test 1: Health check
  let result = await testHealthCheck();
  printTest('1. API Health Check', result);

  if (!result.success) {
    console.log('\n❌ API is not running. Please start the server first:');
    console.log('   cd /Users/user/ZulaRides/zula-backend');
    console.log('   npm start');
    return false;
  }

  // Test 2: Get users for testing
  result = await testGetUsers();
  printTest('2. Get users for testing', result);

  console.log(`\n📊 Using Test IDs:
    Passenger: ${TEST_CONFIG.passengerId}
    Driver: ${TEST_CONFIG.driverId}
  `);

  return true;
};

const runWalletTests = async () => {
  console.log('\n💰 ===== WALLET TESTS =====\n');

  // Test 1: Get initial wallet balance
  let result = await testWalletBalance();
  printTest('1. Get initial wallet balance', result);

  // Test 2: Top up wallet
  result = await testWalletTopUp(1000);
  printTest('2. Top up wallet with 1000', result);

  // Test 3: Get updated balance
  result = await testWalletBalance();
  printTest('3. Get updated wallet balance', result);
};

const runRidePaymentTest = async () => {
  console.log('\n🚗 ===== RIDE PAYMENT TEST =====\n');

  // Test 1: Create ride with wallet payment
  let result = await testCreateRide('wallet');
  printTest('1. Create ride with wallet payment', result);

  if (!result.success) {
    console.log('   Skipping further ride tests due to ride creation failure');
    return;
  }

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

// Main test runner
const runAllTests = async () => {
  try {
    console.log('🧪 STARTING PAYMENT SYSTEM TESTS...\n');

    // First, test basic connection
    const connectionOk = await runBasicConnectionTest();
    if (!connectionOk) return;

    // Run test suites
    await runWalletTests();
    await sleep(1000);
    
    await runRidePaymentTest();

    console.log('\n🎉 ===== ALL TESTS COMPLETED =====');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
};

// Run tests
runAllTests().catch(console.error);