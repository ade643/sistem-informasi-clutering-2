import express from 'express';
import { login, register, getProfile, changePassword } from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', login);
import { body } from 'express-validator';

// Public routes
router.post('/login', login);
router.post(
    '/register', 
    [
        body('nama', 'Nama tidak boleh kosong').notEmpty(),
        body('email', 'Format email tidak valid').isEmail(),
        body('password', 'Password minimal 6 karakter').isLength({ min: 6 })
    ],
    register
);

// Protected routes
router.get('/profile', verifyToken, getProfile);
router.put('/change-password', verifyToken, changePassword);

export default router; 