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

// Room resolvers
export const roomResolvers = {
  Query: {
    // Get a single room by ID
    room: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      return ctx.prisma.room.findUnique({
        where: { id },
      });
    },
    
    // Get a list of rooms with pagination and filtering
    rooms: async (
      _: any,
      {
        page = 1,
        limit = 10,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      }: {
        page?: number;
        limit?: number;
        status?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      },
      ctx: GraphQLContext
    ): Promise<PaginatedResult<any>> => {
      // Calculate pagination values
      const skip = (page - 1) * limit;
      
      // Build where clause for filters
      const where = {} as any;
      if (status) {
        where.status = status;
      }
      
      // Get total count for pagination
      const totalCount = await ctx.prisma.room.count({ where });
      const totalPages = Math.ceil(totalCount / limit);
      
      // Get rooms with pagination, sorting, and filtering
      const rooms = await ctx.prisma.room.findMany({
        skip,
        take: limit,
        where,
        orderBy: { [sortBy]: sortOrder },
      });
      
      // Return paginated result
      return {
        nodes: rooms,
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
    // Create a new room
    createRoom: async (_: any, { input }: { input: any }, ctx: GraphQLContext) => {
      return ctx.prisma.room.create({
        data: input,
      });
    },
    
    // Update an existing room
    updateRoom: async (
      _: any,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      return ctx.prisma.room.update({
        where: { id },
        data: input,
      });
    },
    
    // Delete a room
    deleteRoom: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      await ctx.prisma.room.delete({
        where: { id },
      });
      
      return true;
    },
  },
  
  // Room type resolvers
  Room: {
    // Resolver for renters field
    renters: async (parent: any, _: any, ctx: GraphQLContext) => {
      return ctx.prisma.renter.findMany({
        where: { roomId: parent.id },
      });
    },
    
    // Resolver for contracts field
    contracts: async (parent: any, _: any, ctx: GraphQLContext) => {
      return ctx.prisma.contract.findMany({
        where: { roomId: parent.id },
      });
    },
  },
}; 