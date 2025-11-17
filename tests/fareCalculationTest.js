// tests/fareCalculationTest.js
import axios from 'axios';

const API_BASE = 'http://localhost:5001/api';

async function testFareCalculations() {
  console.log('💰 TESTING FARE CALCULATIONS\n');

  const testCases = [
    { distance: 5, duration: 15, vehicleType: 'standard', surge: 1.0, description: 'Short trip' },
    { distance: 12, duration: 25, vehicleType: 'standard', surge: 1.0, description: 'Medium trip' },
    { distance: 25, duration: 45, vehicleType: 'premium', surge: 1.0, description: 'Long premium trip' },
    { distance: 8, duration: 20, vehicleType: 'standard', surge: 1.5, description: 'Surge pricing' },
    { distance: 2, duration: 8, vehicleType: 'standard', surge: 1.0, description: 'Minimum fare test' }
  ];

  for (const testCase of testCases) {
    try {
      const response = await axios.post(`${API_BASE}/test-rides/test-calculate-fare`, testCase);
      const fare = response.data.fare;
      
      console.log(`🚗 ${testCase.description}:`);
      console.log(`   📏 ${testCase.distance}km, ⏱️ ${testCase.duration}min, 🚘 ${testCase.vehicleType}`);
      console.log(`   💰 Total: ZAR ${fare.totalFare}`);
      console.log(`   📊 Breakdown: Base ZAR ${fare.baseFare} + Distance ZAR ${fare.distanceFare} + Time ZAR ${fare.timeFare}`);
      if (testCase.surge > 1.0) {
        console.log(`   ⚡ Surge: ${testCase.surge}x (ZAR ${fare.surgeAmount})`);
      }
      console.log('');
    } catch (error) {
      console.error(`❌ Test failed for ${testCase.description}:`, error.message);
    }
  }
}

testFareCalculations();