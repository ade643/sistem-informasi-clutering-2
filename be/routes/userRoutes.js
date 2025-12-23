import express from 'express';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  changeUserPassword, 
  getUserStats 
} from '../controllers/userController.js';
import { verifyToken, verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(verifyToken);
router.use(verifyAdmin);

// Get all users with pagination and search
router.get('/', getAllUsers);

// Get user statistics
router.get('/stats', getUserStats);

// Get single user
router.get('/:id', getUserById);

// Create new user
router.post('/', createUser);

// Update user
router.put('/:id', updateUser);

// Delete user
router.delete('/:id', deleteUser);

// Change user password
router.put('/:id/password', changeUserPassword);

export default router; 