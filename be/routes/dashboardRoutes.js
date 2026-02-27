import express from 'express';
import {
  getDashboardStats,
  getChartData,
  getQuickStats,
  getDashboardFilters
} from '../controllers/dashboardController.js';
import { verifyToken, verifyTeacher } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and teacher/admin role
router.use(verifyToken);
router.use(verifyTeacher);

// Get dashboard statistics
router.get('/stats', getDashboardStats);

// Get chart data
router.get('/charts', getChartData);

// Get quick stats
router.get('/quick-stats', getQuickStats);

// Get filters for dashboard
router.get('/filters', getDashboardFilters);

export default router;
