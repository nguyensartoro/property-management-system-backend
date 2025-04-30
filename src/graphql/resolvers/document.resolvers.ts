import { GraphQLContext } from '../context';
import { resolverLogger } from '../../utils/resolverLogger';
import { PaginatedResult, getUserId, calculatePagination } from './common';

/**
 * Check if the user has access to a specific document
 */
async function checkDocumentAccess(ctx: GraphQLContext, document: any): Promise<boolean> {
  const functionName = 'checkDocumentAccess';

  // If document doesn't have a renterId, deny access
  if (!document.renterId) {
    resolverLogger.error(functionName, new Error(`No renterId on document ${document.id}`));
    return false;
  }

  // No user, deny access
  if (!ctx.user) {
    return false;
  }

  // Admin has access to all documents
  if (ctx.user.role === 'ADMIN') {
    return true;
  }

  // For property managers, check if the document belongs to one of their properties
  resolverLogger.db('findUnique', 'Renter', { id: document.renterId });
  const renter = await ctx.prisma.renter.findUnique({
    where: { id: document.renterId },
    include: { room: { include: { property: true } } }
  });

  if (!renter) {
    return false;
  }

  if (ctx.user.role === 'PROPERTY_MANAGER') {
    // Check if the renter belongs to a property managed by this user
    return renter.room?.property?.userId === ctx.user.id;
  }

  // Deny access by default
  return false;
}

/**
 * Get the list of renter IDs accessible to the current user
 */
async function getAccessibleRenterIds(ctx: GraphQLContext): Promise<string[]> {
  const functionName = 'getAccessibleRenterIds';

  // No user, return empty array
  if (!ctx.user) {
    return [];
  }

  // Admin can access all renters
  if (ctx.user.role === 'ADMIN') {
    return []; // Empty array means no restriction
  }

  // For non-property managers, return empty array (will be handled elsewhere)
  if (ctx.user.role !== 'PROPERTY_MANAGER') {
    return [];
  }

  // For property managers, get all properties managed by this user
  resolverLogger.db('findMany', 'Property', { userId: ctx.user.id });
  const properties = await ctx.prisma.property.findMany({
    where: { userId: ctx.user.id },
    include: {
      rooms: {
        include: {
          renters: true
        }
      }
    }
  });

  // Extract renter IDs from all rooms in all properties
  const renterIds: string[] = [];

  for (const property of properties) {
    for (const room of property.rooms) {
      for (const renter of room.renters) {
        renterIds.push(renter.id);
      }
    }
  }

  return renterIds;
}

// Document resolvers
export const documentResolvers = {
  Query: {
    // Get a single document by ID
    document: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      const resolverName = 'document';
      try {
        resolverLogger.log(resolverName, { id }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          resolverLogger.error(resolverName, new Error('Authentication required'));
          throw new Error('You must be authenticated to view documents');
        }

        resolverLogger.db('findUnique', 'Document', { id });
        const document = await ctx.prisma.document.findUnique({
          where: { id },
          include: { renter: true }
        });

        if (!document) {
          resolverLogger.error(resolverName, new Error(`Document not found: ${id}`));
          throw new Error('Document not found');
        }

        // For non-admin users, check if they have access to this document
        if (ctx.user.role !== 'ADMIN') {
          const hasAccess = await checkDocumentAccess(ctx, document);
          if (!hasAccess) {
            resolverLogger.error(resolverName, new Error('Permission denied'));
            throw new Error('You do not have permission to view this document');
          }
        }

        return document;
      } catch (error: any) {
        resolverLogger.error(resolverName, error);
        throw error; // Just rethrow the error
      }
    },

    // Get a list of documents with pagination and filtering
    documents: async (
      _: any,
      {
        page = 1,
        limit = 10,
        renterId,
      }: {
        page?: number;
        limit?: number;
        renterId?: string;
      },
      ctx: GraphQLContext
    ): Promise<PaginatedResult<any>> => {
      const resolverName = 'documents';
      try {
        resolverLogger.log(resolverName, { page, limit, renterId }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          resolverLogger.error(resolverName, new Error('Authentication required'));
          throw new Error('You must be authenticated to view documents');
        }

        // Calculate pagination values
        const skip = (page - 1) * limit;

        // Build where clause for filters
        const where: any = {};

        // Add renterId filter if provided
        if (renterId) {
          where.renterId = renterId;

          // If not admin, check if user has access to this renter's documents
          if (ctx.user.role !== 'ADMIN') {
            resolverLogger.db('findUnique', 'Renter', { id: renterId });
            const renter = await ctx.prisma.renter.findUnique({
              where: { id: renterId },
              include: { room: { include: { property: true } } }
            });

            if (!renter) {
              resolverLogger.error(resolverName, new Error(`Renter not found: ${renterId}`));
              throw new Error('Renter not found');
            }

            // For property managers, check if the renter belongs to their property
            if (ctx.user.role === 'PROPERTY_MANAGER' &&
                renter.room?.property?.userId !== ctx.user.id) {
              resolverLogger.error(
                resolverName,
                new Error(`Permission denied to view documents for renter: ${renterId}`)
              );
              throw new Error('You do not have permission to view documents for this renter');
            }
          }
        } else {
          // If no specific renter filter and not admin, restrict to accessible renters
          if (ctx.user.role !== 'ADMIN') {

            // For property managers, only show documents for their properties' renters
            if (ctx.user.role === 'PROPERTY_MANAGER') {
              const accessibleRenterIds = await getAccessibleRenterIds(ctx);
              if (accessibleRenterIds.length === 0) {
                // No accessible renters, return empty result
                return {
                  nodes: [],
                  pageInfo: {
                    hasNextPage: false,
                    hasPreviousPage: false,
                    totalPages: 0,
                    totalCount: 0,
                    currentPage: page,
                  },
                };
              }
              where.renterId = { in: accessibleRenterIds };
            }
          }
        }

        // Get total count for pagination
        resolverLogger.db('count', 'Document', where);
        const totalCount = await ctx.prisma.document.count({ where });
        
        // Get documents with pagination and filtering
        resolverLogger.db('findMany', 'Document', {
          skip, take: limit, where
        });
        const documents = await ctx.prisma.document.findMany({
          skip,
          take: limit,
          where,
          orderBy: { createdAt: 'desc' },
        });
        
        // Calculate and return paginated result
        const result = calculatePagination(page, limit, totalCount, documents);

        // Log final success
        resolverLogger.log(resolverName, { total: totalCount });
        return result;
      } catch (error: any) {
        resolverLogger.error(resolverName, error);
        throw error; // Just rethrow the error
      }
    },
  },

  Mutation: {
    // Create a new document
    createDocument: async (_: any, { input }: { input: any }, ctx: GraphQLContext) => {
      const resolverName = 'createDocument';
      try {
        // Log input without sensitive data
        const sanitizedInput = { ...input };
        if (sanitizedInput.content) sanitizedInput.content = '[CONTENT_REDACTED]';

        resolverLogger.log(resolverName, { input: sanitizedInput }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          resolverLogger.error(resolverName, new Error('Authentication required'));
          throw new Error('You must be authenticated to create a document');
        }

        // Validate renterId
        if (!input.renterId) {
          resolverLogger.error(resolverName, new Error('Missing required field: renterId'));
          throw new Error('Renter ID is required');
        }

        // Check if renter exists
        resolverLogger.db('findUnique', 'Renter', { id: input.renterId });
        const renter = await ctx.prisma.renter.findUnique({
          where: { id: input.renterId },
          include: { room: { include: { property: true } } }
        });

        if (!renter) {
          resolverLogger.error(resolverName, new Error(`Renter not found: ${input.renterId}`));
          throw new Error('Renter not found');
        }

        // Non-admins need permission to add documents to this renter
        if (ctx.user.role !== 'ADMIN') {
          resolverLogger.log(resolverName, { role: ctx.user.role });

          // Property managers can only add documents to renters in their properties
          if (ctx.user.role === 'PROPERTY_MANAGER' &&
              renter.room?.property?.userId !== ctx.user.id) {
            resolverLogger.error(
              resolverName,
              new Error(`Permission denied for user to add document to renter: ${input.renterId}`)
            );
            throw new Error('You do not have permission to add documents for this renter');
          }
        }

        // Create the document
        resolverLogger.db('create', 'Document', { renterId: input.renterId });
        const document = await ctx.prisma.document.create({
          data: input,
        });

        resolverLogger.log(resolverName, { created: document.id });
        return document;
      } catch (error: any) {
        resolverLogger.error(resolverName, error);
        throw error; // Just rethrow the error
      }
    },

    // Update an existing document
    updateDocument: async (
      _: any,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const resolverName = 'updateDocument';
      try {
        resolverLogger.log(resolverName, { id, input: { ...input, _sanitized: true } }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to update a document');
        }

        // Check if document exists
        resolverLogger.db('findUnique', 'Document', { id });
        const document = await ctx.prisma.document.findUnique({
          where: { id },
          include: { renter: true }
        });

        if (!document) {
          throw new Error('Document not found');
        }

        // Non-admins need permission to update this document
        if (ctx.user.role !== 'ADMIN') {
          const hasAccess = await checkDocumentAccess(ctx, document);
          if (!hasAccess) {
            throw new Error('You do not have permission to update this document');
          }
        }

        // Update the document
        resolverLogger.db('update', 'Document', { id });
        const updatedDocument = await ctx.prisma.document.update({
          where: { id },
          data: input,
        });

        resolverLogger.log(resolverName, { updated: id });
        return updatedDocument;
      } catch (error: any) {
        resolverLogger.error(resolverName, error);
        throw error; // Just rethrow the error
      }
    },

    // Delete a document
    deleteDocument: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      const resolverName = 'deleteDocument';
      try {
        resolverLogger.log(resolverName, { id }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to delete a document');
        }

        // Check if document exists
        resolverLogger.db('findUnique', 'Document', { id });
        const document = await ctx.prisma.document.findUnique({
          where: { id },
          include: { renter: true }
        });

        if (!document) {
          throw new Error('Document not found');
        }

        // Non-admins need permission to delete this document
        if (ctx.user.role !== 'ADMIN') {
          const hasAccess = await checkDocumentAccess(ctx, document);
          if (!hasAccess) {
            throw new Error('You do not have permission to delete this document');
          }
        }

        // Delete the document
        resolverLogger.db('delete', 'Document', { id });
        await ctx.prisma.document.delete({
          where: { id },
        });

        resolverLogger.log(resolverName, { deleted: id });
        return true;
      } catch (error: any) {
        resolverLogger.error(resolverName, error);
        throw error; // Just rethrow the error
      }
    },
  },

  // Document type resolvers
  Document: {
    // Resolver for renter field
    renter: async (parent: any, _: any, ctx: GraphQLContext) => {
      if (!parent.renterId) return null;

      return ctx.prisma.renter.findUnique({
        where: { id: parent.renterId },
      });
    },
  },
};