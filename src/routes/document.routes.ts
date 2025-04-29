import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { validate } from '../middleware/validate';
import { protect } from '../middlewares/auth.middleware';
import { 
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadDocumentFile
} from '../controllers/document.controller';
import { 
  documentIdSchema,
  getDocumentsQuerySchema,
  createDocumentSchema,
  updateDocumentSchema,
  uploadDocumentFileSchema
} from '../schemas/document.schema';

const router = express.Router();

// Set up multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create unique filename with original extension
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `document-${uniqueSuffix}${ext}`);
  }
});

// Set up file filter
const fileFilter = (req, file, cb) => {
  // Accept images and documents
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, PDF, and Word documents are allowed.'), false);
  }
};

// Initialize multer upload
const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Apply authentication middleware to all routes
router.use(protect);

// Get documents with pagination and filtering
router.get(
  '/',
  validate('query', getDocumentsQuerySchema), 
  getDocuments
);

// Get a specific document by ID
router.get(
  '/:id',
  validate('params', documentIdSchema),
  getDocument
);

// Create a new document (metadata only)
router.post(
  '/',
  validate('body', createDocumentSchema),
  createDocument
);

// Upload document file
router.post(
  '/upload',
  validate('body', uploadDocumentFileSchema),
  upload.single('file'),
  uploadDocumentFile
);

// Update an existing document
router.put(
  '/:id',
  validate('params', documentIdSchema),
  validate('body', updateDocumentSchema),
  updateDocument
);

// Delete a document
router.delete(
  '/:id',
  validate('params', documentIdSchema),
  deleteDocument
);

export default router; 