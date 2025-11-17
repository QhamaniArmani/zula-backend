import PricingModel from '../models/PricingModel.js';
import SurgePricing from '../models/SurgePricing.js';

class PricingService {
  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
  }

  toRad(degrees) {
    return degrees * (Math.PI/180);
  }

  // Calculate estimated time based on distance and average speed
  calculateEstimatedTime(distanceKm) {
    const averageSpeed = 30; // km/h in urban areas
    const timeHours = distanceKm / averageSpeed;
    return Math.ceil(timeHours * 60); // Convert to minutes
  }

  // Get surge multiplier for a location
  async getSurgeMultiplier(latitude, longitude) {
    try {
      const surgeAreas = await SurgePricing.find({ active: true });
      
      for (const area of surgeAreas) {
        const distance = this.calculateDistance(
          latitude, longitude,
          area.coordinates.latitude, area.coordinates.longitude
        );
        
        if (distance <= area.radius) {
          return area.multiplier;
        }
      }
      
      return 1.0; // No surge
    } catch (error) {
      console.error('Error getting surge multiplier:', error);
      return 1.0;
    }
  }

  // Get time-based multiplier - UPDATED!
  getTimeBasedMultiplier(distance) {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // For very short trips (< 2km), don't apply time multipliers
    if (distance < 2) {
      return 1.0;
    }

    const isWeekday = day >= 1 && day <= 5;
    const isMorningPeak = hour >= 7 && hour <= 9;
    const isEveningPeak = hour >= 16 && hour <= 19;
    const isWeekendNight = (day === 5 && hour >= 18) || 
                          (day === 6) || 
                          (day === 0 && hour <= 2);

    if (isWeekday && (isMorningPeak || isEveningPeak)) {
      return 1.2; // Reduced from 1.3
    } else if (isWeekendNight) {
      return 1.3; // Reduced from 1.5
    } else if (hour >= 22 || hour <= 5) {
      return 1.2; // Reduced from 1.4
    }
    
    return 1.0;
  }

  // Calculate fare - UPDATED!
  async calculateFare(pickup, destination, vehicleType = 'standard') {
    try {
      // Calculate distance and time
      const distance = this.calculateDistance(
        pickup.latitude, pickup.longitude,
        destination.latitude, destination.longitude
      );
      
      const estimatedTime = this.calculateEstimatedTime(distance);
      
      // Get pricing model for vehicle type
      const pricingModel = await PricingModel.findOne({ 
        name: vehicleType, 
        isActive: true 
      });
      
      if (!pricingModel) {
        throw new Error(`Pricing model not found for vehicle type: ${vehicleType}`);
      }

      // Get multipliers - UPDATED to pass distance
      const surgeMultiplier = await this.getSurgeMultiplier(
        pickup.latitude, pickup.longitude
      );
      const timeMultiplier = this.getTimeBasedMultiplier(distance); // Pass distance here
      const finalMultiplier = surgeMultiplier * timeMultiplier;

      // Calculate fare components
      const baseFare = pricingModel.baseFare;
      const distanceFare = distance * pricingModel.perKmRate;
      const timeFare = estimatedTime * pricingModel.perMinuteRate;
      
      // Total fare before multiplier
      let totalFare = baseFare + distanceFare + timeFare;
      
      // Apply multiplier
      totalFare *= finalMultiplier;
      
      // Ensure minimum fare
      totalFare = Math.max(totalFare, pricingModel.minimumFare);
      
      // Round to nearest whole number (Rands)
      totalFare = Math.round(totalFare);

      return {
        baseFare,
        distance,
        distanceFare: Math.round(distanceFare),
        time: estimatedTime,
        timeFare: Math.round(timeFare),
        surgeMultiplier,
        timeMultiplier,
        finalMultiplier: Math.round(finalMultiplier * 100) / 100,
        totalFare,
        currency: 'ZAR',
        vehicleType,
        breakdown: {
          base: Math.round(baseFare),
          distance: Math.round(distanceFare),
          time: Math.round(timeFare),
          surge: surgeMultiplier,
          timeBased: timeMultiplier
        }
      };
      
    } catch (error) {
      console.error('Error calculating fare:', error);
      throw error;
    }
  }

  // Get fare estimate without creating a ride
  async getFareEstimate(pickup, destination, vehicleType = 'standard') {
    const fareDetails = await this.calculateFare(pickup, destination, vehicleType);
    
    // Add competitive comparison
    const comparison = this.getCompetitiveComparison(
      fareDetails.totalFare,
      fareDetails.distance,
      fareDetails.time
    );
    
    return {
      estimate: fareDetails.totalFare,
      currency: 'ZAR',
      distance: fareDetails.distance,
      estimatedTime: fareDetails.time,
      vehicleType,
      surgeMultiplier: fareDetails.surgeMultiplier,
      breakdown: fareDetails.breakdown,
      competitiveAdvantage: {
        driversKeep100Percent: true,
        comparison: comparison,
        valueProposition: [
          "Riders save 10-15% vs competitors",
          "Drivers keep 100% of fares",
          "Sustainable earnings model",
          "Quick subscription payback"
        ]
      }
    };
  }

  // Compare with competitors - UPDATED!
  getCompetitiveComparison(yourFare, distance, duration) {
    // More realistic competitor pricing
    const uberFare = Math.round(
      15 + // base (increased)
      (distance * 11) + // per km (increased)
      (duration * 2) // per minute (increased)
    );

    const boltFare = Math.round(
      14 + // base (increased)
      (distance * 10.5) + // per km (increased)  
      (duration * 1.8) // per minute (increased)
    );

    const minUberFare = 40; // Increased minimum
    const minBoltFare = 35; // Increased minimum

    const finalUberFare = Math.max(uberFare, minUberFare);
    const finalBoltFare = Math.max(boltFare, minBoltFare);

    const savingsVsUber = finalUberFare - yourFare;
    const savingsVsBolt = finalBoltFare - yourFare;
    
    const percentageVsUber = Math.round((savingsVsUber / finalUberFare) * 100);
    const percentageVsBolt = Math.round((savingsVsBolt / finalBoltFare) * 100);

    return {
      yourFare,
      competitors: {
        uber: finalUberFare,
        bolt: finalBoltFare
      },
      savings: {
        vsUber: savingsVsUber > 0 ? savingsVsUber : 0,
        vsBolt: savingsVsBolt > 0 ? savingsVsBolt : 0,
        percentageVsUber: percentageVsUber,
        percentageVsBolt: percentageVsBolt,
        averagePercentage: Math.round((percentageVsUber + percentageVsBolt) / 2)
      },
      message: this.getSavingsMessage(percentageVsUber, percentageVsBolt)
    };
  }

  getSavingsMessage(percentUber, percentBolt) {
    const avgSavings = (percentUber + percentBolt) / 2;
    
    if (avgSavings >= 15) return 'Great savings! 🎉';
    if (avgSavings >= 10) return 'Good savings! 👍';
    if (avgSavings >= 5) return 'You save! 💰';
    if (avgSavings >= 0) return 'Competitive pricing ✅';
    
    return 'Premium service worth it! ⭐';
  }
}

export default new PricingService();