// utils/setupNotificationTemplates.js - FIXED VERSION
import NotificationTemplate from '../models/NotificationTemplate.js';

const defaultTemplates = [
  {
    name: 'Ride Requested - Driver',
    type: 'ride_requested',
    category: 'ride',
    description: 'Notification sent to drivers when a passenger requests a ride',
    content: {
      inApp: {
        title: 'New Ride Request',
        message: '{{passengerName}} is requesting a ride from {{pickupAddress}} to {{destinationAddress}}'
      },
      push: {
        title: '🚗 New Ride Request',
        body: '{{passengerName}} needs a ride. Tap to view details.'
      },
      sms: {
        body: 'ZulaRides: New ride request from {{passengerName}}. Fare: ZAR {{fare}}. Reply STOP to unsubscribe.'
      },
      email: {
        subject: 'New Ride Request - ZulaRides',
        template: 'ride_requested_driver'
      }
    },
    defaultSettings: {
      priority: 'high',
      channels: { inApp: true, push: true, sms: false, email: false },
      userGroups: ['drivers']
    },
    variables: [
      { name: 'passengerName', description: 'Name of the passenger', sampleValue: 'John Doe' },
      { name: 'pickupAddress', description: 'Pickup location address', sampleValue: '123 Main St' },
      { name: 'destinationAddress', description: 'Destination address', sampleValue: '456 Oak Ave' },
      { name: 'fare', description: 'Estimated fare amount', sampleValue: '85.50' }
    ]
  },
  {
    name: 'Ride Accepted - Passenger',
    type: 'ride_accepted',
    category: 'ride',
    description: 'Notification sent to passengers when a driver accepts their ride',
    content: {
      inApp: {
        title: 'Driver Assigned',
        message: '{{driverName}} has accepted your ride request and is on the way'
      },
      push: {
        title: '✅ Ride Accepted',
        body: '{{driverName}} is coming to pick you up. ETA: {{eta}} minutes'
      },
      sms: {
        body: 'ZulaRides: {{driverName}} has accepted your ride. Vehicle: {{vehicleInfo}}. ETA: {{eta}} min.'
      },
      email: {
        subject: 'Your ZulaRides Driver is On The Way',
        template: 'ride_accepted_passenger'
      }
    },
    defaultSettings: {
      priority: 'normal',
      channels: { inApp: true, push: true, sms: true, email: false },
      userGroups: ['passengers']
    },
    variables: [
      { name: 'driverName', description: 'Name of the driver', sampleValue: 'Sarah Johnson' },
      { name: 'vehicleInfo', description: 'Vehicle make and model', sampleValue: 'Toyota Corolla (CA 123-456)' },
      { name: 'eta', description: 'Estimated time of arrival in minutes', sampleValue: '5' }
    ]
  },
  {
    name: 'Ride Completed - Both',
    type: 'ride_completed',
    category: 'ride',
    description: 'Notification sent when a ride is completed successfully',
    content: {
      inApp: {
        title: 'Ride Completed',
        message: 'Your ride has been completed. Fare: ZAR {{fare}}. Please rate your {{userType}}.'
      },
      push: {
        title: '🎉 Ride Completed',
        body: 'Thanks for riding with ZulaRides! Fare: ZAR {{fare}}. Tap to rate.'
      },
      sms: {
        body: 'ZulaRides: Your ride is complete. Fare: ZAR {{fare}}. Rate your experience in the app.'
      },
      email: {
        subject: 'Ride Completed - ZAR {{fare}}',
        template: 'ride_completed'
      }
    },
    defaultSettings: {
      priority: 'normal',
      channels: { inApp: true, push: true, sms: false, email: true },
      userGroups: ['all']
    },
    variables: [
      { name: 'fare', description: 'Total fare amount', sampleValue: '120.75' },
      { name: 'userType', description: 'Type of user to rate', sampleValue: 'driver' }
    ]
  },
  {
    name: 'Payment Successful',
    type: 'payment_successful',
    category: 'payment',
    description: 'Notification sent when payment is processed successfully',
    content: {
      inApp: {
        title: 'Payment Successful',
        message: 'Payment of ZAR {{amount}} for your ride has been processed successfully'
      },
      push: {
        title: '💳 Payment Processed',
        body: 'ZAR {{amount}} payment successful for your ZulaRides trip'
      },
      sms: {
        body: 'ZulaRides: Payment of ZAR {{amount}} processed successfully for your ride.'
      },
      email: {
        subject: 'Payment Receipt - ZAR {{amount}}',
        template: 'payment_successful'
      }
    },
    defaultSettings: {
      priority: 'normal',
      channels: { inApp: true, push: true, sms: false, email: true },
      userGroups: ['passengers']
    },
    variables: [
      { name: 'amount', description: 'Payment amount', sampleValue: '85.50' }
    ]
  },
  {
    name: 'SOS Activated',
    type: 'sos_activated',
    category: 'safety',
    description: 'Emergency notification sent when SOS is activated',
    content: {
      inApp: {
        title: '🚨 EMERGENCY ALERT',
        message: 'SOS activated. Emergency contacts and authorities have been notified.'
      },
      push: {
        title: '🚨 EMERGENCY SOS ACTIVATED',
        body: 'Your emergency contacts have been notified with your location.'
      },
      sms: {
        body: '🚨 ZulaRides EMERGENCY: SOS activated by {{userName}}. Location shared with emergency contacts.'
      },
      email: {
        subject: '🚨 EMERGENCY: SOS Alert Activated',
        template: 'sos_alert'
      }
    },
    defaultSettings: {
      priority: 'urgent',
      channels: { inApp: true, push: true, sms: true, email: true },
      userGroups: ['all']
    },
    variables: [
      { name: 'userName', description: 'Name of user who activated SOS', sampleValue: 'John Doe' },
      { name: 'locationUrl', description: 'Google Maps URL of location', sampleValue: 'https://maps.google.com/?q=-26.2041,28.0473' }
    ]
  },
  {
    name: 'New Rating Received',
    type: 'new_rating',
    category: 'rating',
    description: 'Notification when a user receives a new rating',
    content: {
      inApp: {
        title: 'New Rating',
        message: '{{raterName}} rated you {{rating}} stars: "{{review}}"'
      },
      push: {
        title: '⭐ New Rating',
        body: '{{raterName}} gave you {{rating}} stars'
      },
      sms: {
        body: 'ZulaRides: {{raterName}} rated you {{rating}} stars for your recent ride.'
      },
      email: {
        subject: 'New Rating Received - {{rating}} Stars',
        template: 'new_rating'
      }
    },
    defaultSettings: {
      priority: 'normal',
      channels: { inApp: true, push: true, sms: false, email: true },
      userGroups: ['all']
    },
    variables: [
      { name: 'raterName', description: 'Name of user who gave rating', sampleValue: 'Sarah Johnson' },
      { name: 'rating', description: 'Rating value (1-5)', sampleValue: '5' },
      { name: 'review', description: 'Review text', sampleValue: 'Excellent service!' }
    ]
  },
  {
    name: 'Driver En Route',
    type: 'driver_en_route',
    category: 'ride',
    description: 'Notification sent when driver is en route to pickup',
    content: {
      inApp: {
        title: 'Driver En Route',
        message: '{{driverName}} is on the way to pick you up. ETA: {{eta}} minutes'
      },
      push: {
        title: '🚗 Driver En Route',
        body: '{{driverName}} is on the way. ETA: {{eta}} minutes'
      },
      sms: {
        body: 'ZulaRides: {{driverName}} is en route to pick you up. ETA: {{eta}} minutes.'
      },
      email: {
        subject: 'Driver En Route - ETA {{eta}} minutes',
        template: 'driver_en_route'
      }
    },
    defaultSettings: {
      priority: 'normal',
      channels: { inApp: true, push: true, sms: true, email: false },
      userGroups: ['passengers']
    },
    variables: [
      { name: 'driverName', description: 'Name of the driver', sampleValue: 'Mike Johnson' },
      { name: 'eta', description: 'Estimated time of arrival', sampleValue: '3' }
    ]
  },
  {
    name: 'Ride Cancelled',
    type: 'ride_cancelled',
    category: 'ride',
    description: 'Notification sent when a ride is cancelled',
    content: {
      inApp: {
        title: 'Ride Cancelled',
        message: 'Your ride was cancelled by {{cancelledBy}}. Reason: {{reason}}'
      },
      push: {
        title: '❌ Ride Cancelled',
        body: 'Ride cancelled by {{cancelledBy}}. Tap for details.'
      },
      sms: {
        body: 'ZulaRides: Your ride was cancelled by {{cancelledBy}}. Reason: {{reason}}'
      },
      email: {
        subject: 'Ride Cancelled',
        template: 'ride_cancelled'
      }
    },
    defaultSettings: {
      priority: 'high',
      channels: { inApp: true, push: true, sms: true, email: true },
      userGroups: ['all']
    },
    variables: [
      { name: 'cancelledBy', description: 'Who cancelled the ride', sampleValue: 'driver' },
      { name: 'reason', description: 'Cancellation reason', sampleValue: 'Vehicle issue' }
    ]
  },
  {
    name: 'Rating Reminder',
    type: 'rating_reminder',
    category: 'rating',
    description: 'Reminder to rate completed rides',
    content: {
      inApp: {
        title: 'Rate Your Ride',
        message: 'How was your ride with {{userName}}? Your feedback helps improve the ZulaRides community.'
      },
      push: {
        title: '⭐ Rate Your Ride',
        body: 'How was your ride with {{userName}}? Tap to rate.'
      },
      sms: {
        body: 'ZulaRides: How was your ride with {{userName}}? Rate your experience in the app.'
      },
      email: {
        subject: 'Rate Your Recent ZulaRides Trip',
        template: 'rating_reminder'
      }
    },
    defaultSettings: {
      priority: 'normal',
      channels: { inApp: true, push: true, sms: false, email: true },
      userGroups: ['all']
    },
    variables: [
      { name: 'userName', description: 'Name of user to rate', sampleValue: 'Sarah Johnson' }
    ]
  },
  {
    name: 'Promotion Offer',
    type: 'promotion_offer',
    category: 'promotion',
    description: 'Promotional offers and discounts',
    content: {
      inApp: {
        title: 'Special Offer!',
        message: '{{offer}} Use code: {{promoCode}}'
      },
      push: {
        title: '🎁 Special Offer',
        body: '{{offer}} Tap to claim your discount!'
      },
      sms: {
        body: 'ZulaRides: {{offer}} Use code: {{promoCode}}. Valid until {{expiryDate}}.'
      },
      email: {
        subject: 'Special ZulaRides Offer - {{promoCode}}',
        template: 'promotion_offer'
      }
    },
    defaultSettings: {
      priority: 'low',
      channels: { inApp: true, push: true, sms: true, email: true },
      userGroups: ['all']
    },
    variables: [
      { name: 'offer', description: 'Offer description', sampleValue: '50% off your next 5 rides!' },
      { name: 'promoCode', description: 'Promotion code', sampleValue: 'ZULA50' },
      { name: 'expiryDate', description: 'Offer expiry date', sampleValue: '2024-12-31' }
    ]
  }
];

export async function setupDefaultNotificationTemplates() {
  try {
    console.log('🔧 Setting up default notification templates...');
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const templateData of defaultTemplates) {
      const existingTemplate = await NotificationTemplate.findOne({ 
        type: templateData.type 
      });
      
      if (!existingTemplate) {
        try {
          await NotificationTemplate.create(templateData);
          console.log(`✅ Created template: ${templateData.name}`);
          createdCount++;
        } catch (createError) {
          console.error(`❌ Failed to create template ${templateData.name}:`, createError.message);
        }
      } else {
        console.log(`ℹ️ Template already exists: ${templateData.name}`);
        skippedCount++;
      }
    }
    
    console.log(`✅ Notification templates setup completed: ${createdCount} created, ${skippedCount} skipped`);
    
  } catch (error) {
    console.error('❌ Error setting up notification templates:', error.message);
  }
}