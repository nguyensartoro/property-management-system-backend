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

// Renter resolvers
export const renterResolvers = {
  Query: {
    // Get a single renter by ID
    renter: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      return ctx.prisma.renter.findUnique({
        where: { id },
      });
    },
    
    // Get a list of renters with pagination and filtering
    renters: async (
      _: any,
      {
        page = 1,
        limit = 10,
        searchText,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      }: {
        page?: number;
        limit?: number;
        searchText?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      },
      ctx: GraphQLContext
    ): Promise<PaginatedResult<any>> => {
      // Calculate pagination values
      const skip = (page - 1) * limit;
      
      // Build where clause for filters
      const where = {} as any;
      if (searchText) {
        where.OR = [
          { name: { contains: searchText, mode: 'insensitive' } },
          { email: { contains: searchText, mode: 'insensitive' } },
          { phone: { contains: searchText, mode: 'insensitive' } },
        ];
      }
      
      // Get total count for pagination
      const totalCount = await ctx.prisma.renter.count({ where });
      const totalPages = Math.ceil(totalCount / limit);
      
      // Get renters with pagination, sorting, and filtering
      const renters = await ctx.prisma.renter.findMany({
        skip,
        take: limit,
        where,
        orderBy: { [sortBy]: sortOrder },
      });
      
      // Return paginated result
      return {
        nodes: renters,
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
    // Create a new renter
    createRenter: async (_: any, { input }: { input: any }, ctx: GraphQLContext) => {
      return ctx.prisma.renter.create({
        data: input,
      });
    },
    
    // Update an existing renter
    updateRenter: async (
      _: any,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      return ctx.prisma.renter.update({
        where: { id },
        data: input,
      });
    },
    
    // Delete a renter
    deleteRenter: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      await ctx.prisma.renter.delete({
        where: { id },
      });
      
      return true;
    },
  },
  
  // Renter type resolvers
  Renter: {
    // Resolver for room field
    room: async (parent: any, _: any, ctx: GraphQLContext) => {
      if (!parent.roomId) return null;
      
      return ctx.prisma.room.findUnique({
        where: { id: parent.roomId },
      });
    },
    
    // Resolver for documents field
    documents: async (parent: any, _: any, ctx: GraphQLContext) => {
      return ctx.prisma.document.findMany({
        where: { renterId: parent.id },
      });
    },
    
    // Resolver for contracts field
    contracts: async (parent: any, _: any, ctx: GraphQLContext) => {
      return ctx.prisma.contract.findMany({
        where: { renterId: parent.id },
      });
    },
    
    // Resolver for payments field
    payments: async (parent: any, _: any, ctx: GraphQLContext) => {
      return ctx.prisma.payment.findMany({
        where: { renterId: parent.id },
      });
    },
  },
}; 