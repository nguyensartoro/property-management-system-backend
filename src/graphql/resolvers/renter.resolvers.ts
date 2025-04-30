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
      try {
        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to view renter details');
        }
        
        const renter = await ctx.prisma.renter.findUnique({
          where: { id },
          include: {
            room: {
              include: {
                property: true
              }
            }
          }
        });
        
        if (!renter) {
          throw new Error('Renter not found');
        }
        
        // Check permissions for non-admin users
        if (ctx.user.role !== 'ADMIN') {
          // Property managers can only view renters in their properties
          if (ctx.user.role === 'PROPERTY_MANAGER') {
            if (renter.room?.property?.userId !== ctx.user.id) {
              throw new Error('You do not have permission to view this renter');
            }
          }
        }
        
        return renter;
      } catch (error: any) {
        console.error('Error fetching renter:', error);
        throw new Error(error.message || 'Failed to fetch renter details');
      }
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
      try {
        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to view renters');
        }
        
        // Calculate pagination values
        const skip = (page - 1) * limit;
        
        // Build where clause for filters
        const where: any = {};
        
        // Add search filter if provided
        if (searchText) {
          where.OR = [
            { name: { contains: searchText, mode: 'insensitive' } },
            { email: { contains: searchText, mode: 'insensitive' } },
            { phone: { contains: searchText, mode: 'insensitive' } },
          ];
        }
        
        // Add user-specific filters based on role
        if (ctx.user.role !== 'ADMIN') {
          // Property managers can only see renters in their properties
          if (ctx.user.role === 'PROPERTY_MANAGER') {
            // Find rooms from properties owned by this user
            const properties = await ctx.prisma.property.findMany({
              where: { userId: ctx.user.id },
              select: { 
                rooms: {
                  select: { id: true }
                }
              }
            });
            
            // Extract room IDs
            const roomIds = properties.flatMap(property => 
              property.rooms.map(room => room.id)
            );
            
            if (roomIds.length === 0) {
              // No rooms found, return empty result
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
            
            // Filter renters by these room IDs
            where.roomId = { in: roomIds };
          }
        }
        
        // Get total count for pagination
        const totalCount = await ctx.prisma.renter.count({ where });
        const totalPages = Math.ceil(totalCount / limit) || 1; // Ensure at least 1 page
        
        // Get renters with pagination, sorting, and filtering
        const renters = await ctx.prisma.renter.findMany({
          skip,
          take: limit,
          where,
          orderBy: { [sortBy]: sortOrder },
          include: {
            room: true
          }
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
      } catch (error: any) {
        console.error('Error fetching renters:', error);
        throw new Error(error.message || 'Failed to fetch renters');
      }
    },
  },
  
  Mutation: {
    // Create a new renter
    createRenter: async (_: any, { input }: { input: any }, ctx: GraphQLContext) => {
      try {
        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to create a renter');
        }
        
        // Validate required fields
        if (!input.name) {
          throw new Error('Name is required');
        }
        
        if (!input.phone) {
          throw new Error('Phone number is required');
        }
        
        // If roomId is provided, check if the room exists and user has access
        if (input.roomId) {
          const room = await ctx.prisma.room.findUnique({
            where: { id: input.roomId },
            include: { property: true }
          });
          
          if (!room) {
            throw new Error('Room not found');
          }
          
          // Check permissions for non-admin users
          if (ctx.user.role !== 'ADMIN') {
            // Property managers can only add renters to their properties
            if (ctx.user.role === 'PROPERTY_MANAGER' && room.property.userId !== ctx.user.id) {
              throw new Error('You do not have permission to add renters to this room');
            }
          }
          
          // Check if the room is already occupied
          if (room.status === 'OCCUPIED') {
            const existingRenters = await ctx.prisma.renter.count({
              where: { roomId: input.roomId }
            });
            
            if (existingRenters > 0) {
              throw new Error('This room is already occupied by another renter');
            }
          }
        }
        
        // Create the renter
        const renter = await ctx.prisma.renter.create({
          data: input,
        });
        
        // If room was provided and created successfully, update room status
        if (input.roomId && renter) {
          await ctx.prisma.room.update({
            where: { id: input.roomId },
            data: { status: 'OCCUPIED' }
          });
        }
        
        return renter;
      } catch (error: any) {
        console.error('Error creating renter:', error);
        throw new Error(error.message || 'Failed to create renter');
      }
    },
    
    // Update an existing renter
    updateRenter: async (
      _: any,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      try {
        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to update a renter');
        }
        
        // Check if renter exists
        const renter = await ctx.prisma.renter.findUnique({
          where: { id },
          include: { 
            room: {
              include: {
                property: true
              }
            }
          }
        });
        
        if (!renter) {
          throw new Error('Renter not found');
        }
        
        // Check permissions for non-admin users
        if (ctx.user.role !== 'ADMIN') {
          // Property managers can only update renters in their properties
          if (ctx.user.role === 'PROPERTY_MANAGER') {
            if (renter.room?.property?.userId !== ctx.user.id) {
              throw new Error('You do not have permission to update this renter');
            }
          }
        }
        
        // If changing roomId, check the new room
        if (input.roomId && input.roomId !== renter.roomId) {
          const newRoom = await ctx.prisma.room.findUnique({
            where: { id: input.roomId },
            include: { property: true }
          });
          
          if (!newRoom) {
            throw new Error('New room not found');
          }
          
          // Check permissions for the new room
          if (ctx.user.role !== 'ADMIN') {
            if (ctx.user.role === 'PROPERTY_MANAGER' && newRoom.property.userId !== ctx.user.id) {
              throw new Error('You do not have permission to move this renter to the specified room');
            }
          }
          
          // Check if the new room is already occupied
          if (newRoom.status === 'OCCUPIED') {
            const existingRenters = await ctx.prisma.renter.count({
              where: { roomId: input.roomId }
            });
            
            if (existingRenters > 0) {
              throw new Error('The new room is already occupied by another renter');
            }
          }
        }
        
        // Update the renter
        const updatedRenter = await ctx.prisma.renter.update({
          where: { id },
          data: input,
        });
        
        // Handle room status changes if roomId changed
        if (input.roomId && input.roomId !== renter.roomId) {
          // Update new room status to Occupied
          await ctx.prisma.room.update({
            where: { id: input.roomId },
            data: { status: 'OCCUPIED' }
          });
          
          // Update old room status to Available if no other renters
          if (renter.roomId) {
            const otherRenters = await ctx.prisma.renter.count({
              where: { 
                roomId: renter.roomId,
                id: { not: id }
              }
            });
            
            if (otherRenters === 0) {
              await ctx.prisma.room.update({
                where: { id: renter.roomId },
                data: { status: 'AVAILABLE' }
              });
            }
          }
        }
        
        return updatedRenter;
      } catch (error: any) {
        console.error('Error updating renter:', error);
        throw new Error(error.message || 'Failed to update renter');
      }
    },
    
    // Delete a renter
    deleteRenter: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      try {
        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to delete a renter');
        }
        
        // Check if renter exists
        const renter = await ctx.prisma.renter.findUnique({
          where: { id },
          include: { 
            room: {
              include: {
                property: true
              }
            }
          }
        });
        
        if (!renter) {
          throw new Error('Renter not found');
        }
        
        // Check permissions for non-admin users
        if (ctx.user.role !== 'ADMIN') {
          // Property managers can only delete renters from their properties
          if (ctx.user.role === 'PROPERTY_MANAGER') {
            if (renter.room?.property?.userId !== ctx.user.id) {
              throw new Error('You do not have permission to delete this renter');
            }
          }
        }
        
        // Store roomId for later use
        const roomId = renter.roomId;
        
        // Delete the renter
        await ctx.prisma.renter.delete({
          where: { id },
        });
        
        // Update room status if no other renters
        if (roomId) {
          const otherRenters = await ctx.prisma.renter.count({
            where: { roomId }
          });
          
          if (otherRenters === 0) {
            await ctx.prisma.room.update({
              where: { id: roomId },
              data: { status: 'AVAILABLE' }
            });
          }
        }
        
        return true;
      } catch (error: any) {
        console.error('Error deleting renter:', error);
        throw new Error(error.message || 'Failed to delete renter');
      }
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