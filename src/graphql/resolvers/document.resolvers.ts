import { GraphQLContext } from '../context';

// Interface defining paginated results
interface PaginatedResult<T> {
  nodes: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalPages: number;
    totalCount: number;
    currentPage: number;
  };
}

// Document resolvers
export const documentResolvers = {
  Query: {
    // Get a single document by ID
    document: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      return ctx.prisma.document.findUnique({
        where: { id },
      });
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
      // Calculate pagination values
      const skip = (page - 1) * limit;
      
      // Build where clause for filters
      const where = {} as any;
      if (renterId) {
        where.renterId = renterId;
      }
      
      // Get total count for pagination
      const totalCount = await ctx.prisma.document.count({ where });
      const totalPages = Math.ceil(totalCount / limit);
      
      // Get documents with pagination and filtering
      const documents = await ctx.prisma.document.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      });
      
      // Return paginated result
      return {
        nodes: documents,
        pageInfo: {
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          totalPages,
          totalCount,
          currentPage: page,
        },
      };
    },
  },
  
  Mutation: {
    // Create a new document
    createDocument: async (_: any, { input }: { input: any }, ctx: GraphQLContext) => {
      return ctx.prisma.document.create({
        data: input,
      });
    },
    
    // Update an existing document
    updateDocument: async (
      _: any,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      return ctx.prisma.document.update({
        where: { id },
        data: input,
      });
    },
    
    // Delete a document
    deleteDocument: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      await ctx.prisma.document.delete({
        where: { id },
      });
      
      return true;
    },
  },
  
  // Document type resolvers
  Document: {
    // Resolver for renter field
    renter: async (parent: any, _: any, ctx: GraphQLContext) => {
      return ctx.prisma.renter.findUnique({
        where: { id: parent.renterId },
      });
    },
  },
}; 