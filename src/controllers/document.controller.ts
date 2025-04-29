import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Get all documents with pagination and filtering
 */
export const getDocuments = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, renterId } = req.query;
    
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const where = renterId ? { renterId: String(renterId) } : {};
    
    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { renter: true }
      }),
      prisma.document.count({ where })
    ]);
    
    return res.status(200).json({
      documents,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      totalCount: total
    });
  } catch (error) {
    logger.error('Error fetching documents:', error);
    return res.status(500).json({ message: 'Failed to fetch documents' });
  }
};

/**
 * Get a single document by ID
 */
export const getDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const document = await prisma.document.findUnique({
      where: { id },
      include: { renter: true }
    });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    return res.status(200).json(document);
  } catch (error) {
    logger.error('Error fetching document:', error);
    return res.status(500).json({ message: 'Failed to fetch document' });
  }
};

/**
 * Create a new document (metadata only)
 */
export const createDocument = async (req: Request, res: Response) => {
  try {
    const { name, type, description, renterId } = req.body;
    
    // If renterId is provided, check if renter exists
    if (renterId) {
      const renter = await prisma.renter.findUnique({ where: { id: renterId } });
      
      if (!renter) {
        return res.status(404).json({ message: 'Renter not found' });
      }
    }
    
    const document = await prisma.document.create({
      data: {
        name, 
        type,
        description,
        renterId
      }
    });
    
    return res.status(201).json(document);
  } catch (error) {
    logger.error('Error creating document:', error);
    return res.status(500).json({ message: 'Failed to create document' });
  }
};

/**
 * Handle file upload for documents
 */
export const uploadDocumentFile = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { documentId } = req.body;
    
    if (!documentId) {
      return res.status(400).json({ message: 'Document ID is required' });
    }
    
    // Check if document exists
    const document = await prisma.document.findUnique({ where: { id: documentId } });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Update document with file path
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        path: req.file.path,
      }
    });
    
    return res.status(200).json({
      message: 'File uploaded successfully',
      document: updatedDocument
    });
  } catch (error) {
    logger.error('Error uploading document file:', error);
    return res.status(500).json({ message: 'Failed to upload file' });
  }
};

/**
 * Update an existing document
 */
export const updateDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, type, description } = req.body;
    
    // Check if document exists
    const existingDocument = await prisma.document.findUnique({ where: { id } });
    
    if (!existingDocument) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    const document = await prisma.document.update({
      where: { id },
      data: {
        name,
        type,
        description
      }
    });
    
    return res.status(200).json(document);
  } catch (error) {
    logger.error('Error updating document:', error);
    return res.status(500).json({ message: 'Failed to update document' });
  }
};

/**
 * Delete a document
 */
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if document exists
    const document = await prisma.document.findUnique({ where: { id } });
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // If file exists, delete it
    if (document.path) {
      const fs = require('fs');
      if (fs.existsSync(document.path)) {
        fs.unlinkSync(document.path);
      }
    }
    
    await prisma.document.delete({ where: { id } });
    
    return res.status(200).json({ message: 'Document deleted successfully' });
  } catch (error) {
    logger.error('Error deleting document:', error);
    return res.status(500).json({ message: 'Failed to delete document' });
  }
}; 