import express from 'express';
import {
  getPassengers,
  getPassengerById,
  createPassenger,
  updatePassenger,
  deletePassenger,
  getPassengerRides,
  addFavoriteLocation,
  removeFavoriteLocation,
  updatePassengerRating
} from '../controllers/passengerController.js';

const router = express.Router();

// Passenger management
router.get('/', getPassengers);
router.get('/:id', getPassengerById);
router.post('/', createPassenger);
router.put('/:id', updatePassenger);
router.delete('/:id', deletePassenger);

// Passenger rides
router.get('/:id/rides', getPassengerRides);

// Favorite locations
router.post('/:id/favorite-locations', addFavoriteLocation);
router.delete('/:id/favorite-locations/:locationId', removeFavoriteLocation);

// Rating
router.patch('/:id/rating', updatePassengerRating);

export default router;