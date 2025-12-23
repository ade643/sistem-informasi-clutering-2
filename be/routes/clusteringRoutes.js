import express from 'express';
import { 
  runClustering, 
  getClusteringResults, 
  getClusteringStats, 
  clearClusteringResults,
  downloadClusteringReport
} from '../controllers/clusteringController.js';

import { verifyToken, verifyTeacher } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get elbow analysis


// Get clustering results with pagination and filtering
router.get('/results', getClusteringResults);

// Get clustering statistics
router.get('/stats', getClusteringStats);

// Download clustering report
router.get('/download', verifyTeacher, downloadClusteringReport);



// Run clustering algorithm (requires teacher/admin role)
router.post('/run', verifyTeacher, runClustering);

// Clear clustering results (requires teacher/admin role)
router.delete('/clear', verifyTeacher, clearClusteringResults);

export default router;
