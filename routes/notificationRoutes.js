// routes/notificationRoutes.js
import express from 'express';
import notificationController from '../controllers/notificationController.js';

const router = express.Router();

// User notification routes
router.get('/', notificationController.getUserNotifications);
router.patch('/:notificationId/read', notificationController.markAsRead);
router.patch('/read-all', notificationController.markAllAsRead);
router.post('/:notificationId/click', notificationController.recordClickThrough);
router.delete('/:notificationId', notificationController.deleteNotification);

// Test and admin routes
router.post('/test', notificationController.sendTestNotification);
router.get('/statistics', notificationController.getNotificationStats);
router.post('/bulk', notificationController.sendBulkNotification);
router.post('/retry-failed', notificationController.retryFailedNotifications);

export default router;