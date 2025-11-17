import Passenger from '../models/Passenger.js';
import Ride from '../models/Ride.js';

// Get all passengers
export const getPassengers = async (req, res) => {
  try {
    const passengers = await Passenger.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      message: 'Passengers retrieved successfully',
      data: passengers,
      count: passengers.length
    });
  } catch (error) {
    console.error('Error fetching passengers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching passengers'
    });
  }
};

// Get passenger by ID
export const getPassengerById = async (req, res) => {
  try {
    const passenger = await Passenger.findById(req.params.id);
    
    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'Passenger not found'
      });
    }

    res.json({
      success: true,
      message: 'Passenger retrieved successfully',
      data: passenger
    });
  } catch (error) {
    console.error('Error fetching passenger:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching passenger'
    });
  }
};

// Create new passenger
export const createPassenger = async (req, res) => {
  try {
    const { name, email, phone, profilePhoto, emergencyContact } = req.body;

    // Check if passenger already exists
    const existingPassenger = await Passenger.findOne({ email });
    if (existingPassenger) {
      return res.status(400).json({
        success: false,
        message: 'Passenger with this email already exists'
      });
    }

    const passenger = new Passenger({
      name,
      email,
      phone,
      profilePhoto,
      emergencyContact
    });

    await passenger.save();

    res.status(201).json({
      success: true,
      message: 'Passenger created successfully',
      data: passenger
    });
  } catch (error) {
    console.error('Error creating passenger:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating passenger'
    });
  }
};

// Update passenger
export const updatePassenger = async (req, res) => {
  try {
    const passenger = await Passenger.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'Passenger not found'
      });
    }

    res.json({
      success: true,
      message: 'Passenger updated successfully',
      data: passenger
    });
  } catch (error) {
    console.error('Error updating passenger:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating passenger'
    });
  }
};

// Delete passenger
export const deletePassenger = async (req, res) => {
  try {
    const passenger = await Passenger.findByIdAndDelete(req.params.id);

    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'Passenger not found'
      });
    }

    res.json({
      success: true,
      message: 'Passenger deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting passenger:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting passenger'
    });
  }
};

// Get passenger ride history
export const getPassengerRides = async (req, res) => {
  try {
    const rides = await Ride.find({ passengerId: req.params.id })
      .populate('driverId')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Passenger rides retrieved successfully',
      data: rides,
      count: rides.length
    });
  } catch (error) {
    console.error('Error fetching passenger rides:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching passenger rides'
    });
  }
};

// Add favorite location
export const addFavoriteLocation = async (req, res) => {
  try {
    const { name, address, coordinates, type } = req.body;

    const passenger = await Passenger.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          favoriteLocations: {
            name,
            address,
            coordinates,
            type: type || 'favorite'
          }
        }
      },
      { new: true }
    );

    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'Passenger not found'
      });
    }

    res.json({
      success: true,
      message: 'Favorite location added successfully',
      data: passenger.favoriteLocations
    });
  } catch (error) {
    console.error('Error adding favorite location:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding favorite location'
    });
  }
};

// Remove favorite location
export const removeFavoriteLocation = async (req, res) => {
  try {
    const passenger = await Passenger.findByIdAndUpdate(
      req.params.id,
      {
        $pull: {
          favoriteLocations: { _id: req.params.locationId }
        }
      },
      { new: true }
    );

    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'Passenger not found'
      });
    }

    res.json({
      success: true,
      message: 'Favorite location removed successfully',
      data: passenger.favoriteLocations
    });
  } catch (error) {
    console.error('Error removing favorite location:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing favorite location'
    });
  }
};

// Update passenger rating (called when a ride is completed)
export const updatePassengerRating = async (req, res) => {
  try {
    const { rating } = req.body;

    if (rating < 0 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 0 and 5'
      });
    }

    const passenger = await Passenger.findById(req.params.id);

    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'Passenger not found'
      });
    }

    // Calculate new average rating
    const newTotalRides = passenger.totalRides + 1;
    const newRating = ((passenger.rating * passenger.totalRides) + rating) / newTotalRides;

    passenger.rating = Math.round(newRating * 100) / 100; // Round to 2 decimal places
    passenger.totalRides = newTotalRides;
    passenger.lastActive = new Date();

    await passenger.save();

    res.json({
      success: true,
      message: 'Passenger rating updated successfully',
      data: {
        rating: passenger.rating,
        totalRides: passenger.totalRides
      }
    });
  } catch (error) {
    console.error('Error updating passenger rating:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating passenger rating'
    });
  }
};