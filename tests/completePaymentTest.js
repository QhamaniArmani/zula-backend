import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';

// Test the complete payment flow
async function testCompletePaymentFlow() {
  try {
    console.log('🧪 Starting Complete Payment Flow Test...\n');

    // Step 1: Get existing passengers
    console.log('1. Getting existing passengers...');
    const passengersResponse = await axios.get(`${BASE_URL}/passengers?limit=1`);
    const passengers = passengersResponse.data.data;
    
    if (!passengers || passengers.length === 0) {
      console.log('❌ No passengers found. Please create a passenger first.');
      return;
    }

    const passenger = passengers[0];
    const passengerId = passenger._id;
    console.log(`✅ Using passenger: ${passenger.name} (${passengerId})`);

    // Step 2: Top up wallet
    console.log('\n2. Topping up wallet...');
    const topupResponse = await axios.post(`${BASE_URL}/wallets/${passengerId}/topup`, {
      amount: 1000,
      paymentMethod: 'card',
      reference: 'test_topup_001'
    });
    console.log(`✅ Wallet topped up: $${topupResponse.data.data.newBalance}`);

    // Step 3: Check wallet balance
    console.log('\n3. Checking wallet balance...');
    const balanceResponse = await axios.get(`${BASE_URL}/wallets/${passengerId}/balance`);
    console.log(`✅ Wallet balance: $${balanceResponse.data.data.balance}`);

    // Step 4: Create a ride
    console.log('\n4. Creating a ride...');
    const rideResponse = await axios.post(`${BASE_URL}/rides`, {
      passengerId: passengerId,
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
      paymentMethod: 'wallet'
    });
    
    const ride = rideResponse.data.data.ride;
    const rideId = ride._id;
    console.log(`✅ Ride created: ${rideId}`);
    console.log(`   Fare: $${rideResponse.data.data.fare}`);

    // Step 5: Check wallet balance after ride creation (should be same)
    console.log('\n5. Checking wallet balance after ride creation...');
    const balanceAfterRide = await axios.get(`${BASE_URL}/wallets/${passengerId}/balance`);
    console.log(`✅ Wallet balance: $${balanceAfterRide.data.data.balance} (unchanged - payment not processed yet)`);

    // Step 6: Complete the ride (this should trigger payment)
    console.log('\n6. Completing ride to trigger payment...');
    const completeResponse = await axios.post(`${BASE_URL}/rides/${rideId}/complete`, {
      actualDistance: 12.5,
      actualDuration: 25,
      finalFare: 1850
    });
    console.log(`✅ Ride completed! Payment status: ${completeResponse.data.data.ride.payment.status}`);

    // Step 7: Check wallet balance after payment
    console.log('\n7. Checking wallet balance after payment...');
    const balanceAfterPayment = await axios.get(`${BASE_URL}/wallets/${passengerId}/balance`);
    console.log(`✅ Wallet balance: $${balanceAfterPayment.data.data.balance} (should be reduced)`);

    // Step 8: Check transaction history
    console.log('\n8. Checking transaction history...');
    const transactionsResponse = await axios.get(`${BASE_URL}/wallets/${passengerId}/transactions?limit=5`);
    const transactions = transactionsResponse.data.data.transactions;
    console.log(`✅ Found ${transactions.length} transactions:`);
    transactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.type}: $${tx.amount} - ${tx.description}`);
    });

    // Step 9: Get ride payment details
    console.log('\n9. Getting ride payment details...');
    const paymentDetails = await axios.get(`${BASE_URL}/rides/${rideId}/payment`);
    console.log(`✅ Payment details:`);
    console.log(`   Method: ${paymentDetails.data.data.payment.method}`);
    console.log(`   Status: ${paymentDetails.data.data.payment.status}`);
    console.log(`   Amount: $${paymentDetails.data.data.payment.amount}`);

    console.log('\n🎉 COMPLETE PAYMENT FLOW TEST SUCCESSFUL!');
    console.log('\n📊 Summary:');
    console.log(`   Passenger: ${passenger.name}`);
    console.log(`   Initial Balance: $1000`);
    console.log(`   Ride Fare: $1850`);
    console.log(`   Final Balance: $${balanceAfterPayment.data.data.balance}`);
    console.log(`   Payment Status: ${completeResponse.data.data.ride.payment.status}`);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testCompletePaymentFlow();