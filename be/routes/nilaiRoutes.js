import express from 'express';
import multer from 'multer';
import {
  getAllNilai,
  createOrUpdateNilai,
  deleteNilaiBySiswa,
  getAllMapel,
  createMapel, // <-- Add this import
  getNilaiFilters,
  uploadNilaiFromExcel,
  getNilaiBySiswa,
  getNilaiUploadHistory
} from '../controllers/nilaiController.js';
import { verifyToken, verifyTeacher } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// All routes below require an authenticated user
router.use(verifyToken);

// Route to get upload history
router.get('/history', getNilaiUploadHistory);

// Route to upload and process an Excel file
router.post('/upload', verifyTeacher, upload.single('file'), uploadNilaiFromExcel);

// Get all subjects (mapel)
router.get('/mapel', getAllMapel);

// Create a new subject (mapel)
router.post('/mapel', verifyTeacher, createMapel); // <-- Add this route

// Get filters for nilai
router.get('/filters', getNilaiFilters);

// Get all grade data (paginated, searchable)
router.get('/', getAllNilai);

// Get a specific student's grade details for a period
router.get('/siswa/:siswa_id', getNilaiBySiswa);

// Create or Update a student's entire grade report for a semester
router.post('/', verifyTeacher, createOrUpdateNilai);

// Delete a student's entire grade report for a semester
router.delete('/', verifyTeacher, deleteNilaiBySiswa);

export default router; 