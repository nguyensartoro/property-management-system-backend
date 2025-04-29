import { z } from 'zod';

// Schema for document ID validation
export const documentIdSchema = z.object({
  id: z.string().uuid({ message: 'Invalid document ID format' })
});

// Schema for GET documents query parameters
export const getDocumentsQuerySchema = z.object({
  page: z.coerce.number().positive().optional().default(1),
  limit: z.coerce.number().positive().optional().default(10),
  renterId: z.string().uuid({ message: 'Invalid renter ID format' }).optional()
});

// Schema for creating a new document
export const createDocumentSchema = z.object({
  name: z.string().min(1, { message: 'Document name is required' }).max(100),
  type: z.string().min(1, { message: 'Document type is required' }).max(50),
  description: z.string().max(500).optional(),
  renterId: z.string().uuid({ message: 'Invalid renter ID format' }).optional()
});

// Schema for updating an existing document
export const updateDocumentSchema = z.object({
  name: z.string().min(1, { message: 'Document name is required' }).max(100).optional(),
  type: z.string().min(1, { message: 'Document type is required' }).max(50).optional(),
  description: z.string().max(500).optional()
});

// Schema for document file upload
export const uploadDocumentFileSchema = z.object({
  documentId: z.string().uuid({ message: 'Invalid document ID format' })
}); 