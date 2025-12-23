import express from 'express';
import { 
  getAllSiswa, 
  getSiswaById, 
  createSiswa, 
  updateSiswa, 
  deleteSiswa, 
  getSiswaStats,
  getAllKelas 
} from '../controllers/siswaController.js';
import { verifyToken, verifyTeacher } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all siswa with pagination and search
router.get('/', getAllSiswa);

// Get all distinct classes
router.get('/classes', getAllKelas);

// Get siswa statistics
router.get('/stats', getSiswaStats);

// Get single siswa
router.get('/:id', getSiswaById);

// Create new siswa (requires teacher/admin role)
router.post('/', verifyTeacher, createSiswa);

// Update siswa (requires teacher/admin role)
router.put('/:id', verifyTeacher, updateSiswa);

// Delete siswa (requires teacher/admin role)
router.delete('/:id', verifyTeacher, deleteSiswa);

export default router; 