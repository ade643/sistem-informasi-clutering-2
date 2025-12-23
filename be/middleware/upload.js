import multer from 'multer';

// Set up multer for file uploads
const storage = multer.memoryStorage(); // Store file in memory

const fileFilter = (req, file, cb) => {
  // Accept Excel files only
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/vnd.ms-excel') {
    cb(null, true);
  } else {
    cb(new Error('Hanya file Excel (.xlsx, .xls) yang diizinkan!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB file size limit
  }
});

export default upload;
