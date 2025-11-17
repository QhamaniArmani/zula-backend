# Real-time Events Documentation

## Connection Events
- `driver-join` - Driver connects with authentication
- `passenger-join` - Passenger connects with authentication

## Location Events
- `driver-location-update` - Driver sends location updates
- `ride-location-update` - Real-time ride tracking

## Ride Events
- `ride-status-update` - Ride status changes
- `request-nearby-drivers` - Passenger requests drivers
- `send-message` - In-ride chat

## Notification Events
- `new-ride-request` - Driver receives ride request
- `ride-update` - Passenger receives ride updates
- `notification` - General notifications

## Emergency Events
- `emergency-alert` - SOS/emergency notifications