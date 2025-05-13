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

// Add interface for query args
type RoomQueryArgs = {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

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
        search,
        type,
        status,
        minPrice,
        maxPrice,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      }: RoomQueryArgs,
      ctx: GraphQLContext
    ): Promise<PaginatedResult<any>> => {
      const skip = (page - 1) * limit;

      // Build where clause for filters
      const where: any = {};

      // Search by room number or name (case-insensitive)
      if (search) {
        where.OR = [
          { number: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Filter by type
      if (type) {
        where.type = type;
      }

      // Filter by status
      if (status) {
        where.status = status;
      }

      // Filter by price range
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        if (minPrice !== undefined) where.price.gte = minPrice;
        if (maxPrice !== undefined) where.price.lte = maxPrice;
      }

      // Get total count for pagination
      const totalCount = await ctx.prisma.room.count({ where }) || 0;
      const totalPages = Math.ceil(totalCount / limit);

      // Validate sort field
      const validSortFields = [
        'id', 'name', 'number', 'floor', 'size', 'description', 'status', 'price', 'images', 'propertyId', 'createdAt', 'updatedAt', 'type'
      ];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc';

      // Fetch rooms
      const rooms = await ctx.prisma.room.findMany({
        skip,
        take: limit,
        where,
        orderBy: { [sortField]: sortDirection },
      });

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
      console.log(' ===== updateRoom id', id);

      return ctx.prisma.room.update({
        where: { id },
        data: input,
      });
    },

    // Delete a room
    deleteRoom: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      console.log(' ===== deleteRoom id', id);

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