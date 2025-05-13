import { GraphQLContext } from '../context';
import { resolverLogger } from '../../utils/resolverLogger';
import { calculatePagination } from './common';
import { MaintenanceEvent, Prisma, MaintenanceStatus, MaintenancePriority } from '@prisma/client';
import { nanoid } from 'nanoid';

// Function to safely get user ID for logging
function getUserId(ctx: GraphQLContext): string {
  if (ctx.user && 'id' in ctx.user) {
    return ctx.user.id;
  }
  return 'unauthenticated';
}

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

// MaintenanceEvent resolvers
export const maintenanceResolvers = {
  Query: {
    // Get a single maintenance event by ID
    maintenanceEvent: async (_parent: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const resolverName = 'maintenanceEvent';
      try {
        resolverLogger.log(resolverName, { id }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to view maintenance details');
        }

        const maintenance = await ctx.prisma.maintenanceEvent.findUnique({
          where: { id },
          include: { room: true }
        });

        if (!maintenance) {
          throw new Error('Maintenance event not found');
        }

        return maintenance;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },
    
    // Get a list of maintenance events with pagination and filtering
    maintenanceEvents: async (
      _parent: unknown,
      {
        page = 1,
        limit = 10,
        roomId,
        status,
        priority,
        fromDate,
        toDate,
        sortBy = 'scheduledDate',
        sortOrder = 'desc',
      }: {
        page?: number;
        limit?: number;
        roomId?: string;
        status?: string;
        priority?: string;
        fromDate?: string;
        toDate?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      },
      ctx: GraphQLContext
    ) => {
      const resolverName = 'maintenanceEvents';
      try {
        resolverLogger.log(resolverName, { 
          page, limit, roomId, status, priority, fromDate, toDate 
        }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to view maintenance events');
        }

        // Build where clause for filters
        const where: Prisma.MaintenanceEventWhereInput = {
          ...(roomId && { roomId }),
          ...(status && { status: status as MaintenanceStatus }),
          ...(priority && { priority: priority as MaintenancePriority }),
          ...(fromDate || toDate) && {
            scheduledDate: {
              ...(fromDate && { gte: new Date(fromDate) }),
              ...(toDate && { lte: new Date(toDate) })
            }
          }
        };
        
        // Get total count for pagination
        const totalCount = await ctx.prisma.maintenanceEvent.count({ where });
        
        // Get maintenance events with pagination, sorting, and filtering
        const maintenanceEvents = await ctx.prisma.maintenanceEvent.findMany({
          skip: (page - 1) * limit,
          take: limit,
          where,
          orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
          include: { room: true }
        });
        
        // Return paginated result using the helper function
        const result = calculatePagination(page, limit, totalCount, maintenanceEvents);

        resolverLogger.log(resolverName, { total: totalCount });
        return result;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },
  },
  
  Mutation: {
    // Create a new maintenance event
    createMaintenanceEvent: async (_parent: unknown, { input }: { input: any }, ctx: GraphQLContext) => {
      const resolverName = 'createMaintenanceEvent';
      try {
        resolverLogger.log(resolverName, { input }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to create a maintenance event');
        }

        // Validate required fields
        const requiredFields = [
          { field: 'title', message: 'Title is required' },
          { field: 'description', message: 'Description is required' },
          { field: 'roomId', message: 'Room ID is required' }
        ];
        
        for (const { field, message } of requiredFields) {
          if (!input[field]) {
            throw new Error(message);
          }
        }

        // Ensure status and priority are valid enum values if provided
        if (input.status) {
          input.status = input.status as MaintenanceStatus;
        }
        
        if (input.priority) {
          input.priority = input.priority as MaintenancePriority;
        }

        // Check if room exists
        const room = await ctx.prisma.room.findUnique({
          where: { id: input.roomId }
        });

        if (!room) {
          throw new Error('Room not found');
        }

        // If setting to MAINTENANCE status, update the room status
        if (input.status === 'IN_PROGRESS') {
          await ctx.prisma.room.update({
            where: { id: input.roomId },
            data: { status: 'MAINTENANCE' }
          });
        }

        // Create the maintenance event
        const maintenanceEvent = await ctx.prisma.maintenanceEvent.create({
          data: {
            id: nanoid(),
            ...input,
            updatedAt: new Date()
          },
          include: { room: true }
        });

        resolverLogger.log(resolverName, { created: maintenanceEvent.id });
        return maintenanceEvent;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },
    
    // Update an existing maintenance event
    updateMaintenanceEvent: async (
      _parent: unknown, 
      { id, input }: { id: string; input: any }, 
      ctx: GraphQLContext
    ) => {
      const resolverName = 'updateMaintenanceEvent';
      try {
        resolverLogger.log(resolverName, { id, input }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to update a maintenance event');
        }

        // Ensure status and priority are valid enum values if provided
        if (input.status) {
          input.status = input.status as MaintenanceStatus;
        }
        
        if (input.priority) {
          input.priority = input.priority as MaintenancePriority;
        }

        // Check if maintenance event exists
        const maintenanceEvent = await ctx.prisma.maintenanceEvent.findUnique({
          where: { id },
          include: { room: true }
        });

        if (!maintenanceEvent) {
          throw new Error('Maintenance event not found');
        }

        // Handle status transitions and their side effects
        await handleStatusTransition(ctx, input, maintenanceEvent as MaintenanceEventWithRoom);

        // Update the maintenance event
        const updatedMaintenanceEvent = await ctx.prisma.maintenanceEvent.update({
          where: { id },
          data: input,
          include: { room: true }
        });

        resolverLogger.log(resolverName, { updated: id, status: input.status });
        return updatedMaintenanceEvent;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },
    
    // Delete a maintenance event
    deleteMaintenanceEvent: async (_parent: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      const resolverName = 'deleteMaintenanceEvent';
      try {
        resolverLogger.log(resolverName, { id }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to delete a maintenance event');
        }

        // Check if maintenance event exists
        const maintenanceEvent = await ctx.prisma.maintenanceEvent.findUnique({
          where: { id },
          include: { room: true }
        });

        if (!maintenanceEvent) {
          throw new Error('Maintenance event not found');
        }

        // Don't allow deletion of IN_PROGRESS events
        if (maintenanceEvent.status === 'IN_PROGRESS') {
          throw new Error('Cannot delete a maintenance event that is in progress. Complete or cancel it first.');
        }

        // Delete the maintenance event
        await ctx.prisma.maintenanceEvent.delete({
          where: { id }
        });

        resolverLogger.log(resolverName, { deleted: id });
        return true;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },
  },
  
  // MaintenanceEvent type resolvers
  MaintenanceEvent: {
    // Resolver for room field
    room: async (parent: MaintenanceEvent, _args: unknown, ctx: GraphQLContext) => {
      if (!parent.roomId) return null;
      return ctx.prisma.room.findUnique({
        where: { id: parent.roomId }
      });
    },
  },
};

interface MaintenanceEventWithRoom extends MaintenanceEvent {
  room: {
    id: string;
    status: string;
  };
}

// Helper function to handle status transitions and side effects
async function handleStatusTransition(
  ctx: GraphQLContext,
  input: any,
  maintenanceEvent: MaintenanceEventWithRoom
) {
  // If status is changing to COMPLETED, set completedDate if not provided
  if (input.status === 'COMPLETED' && !input.completedDate) {
    input.completedDate = new Date();
    
    // If room is in MAINTENANCE status, change it back to AVAILABLE
    if (maintenanceEvent.room.status === 'MAINTENANCE') {
      await ctx.prisma.room.update({
        where: { id: maintenanceEvent.roomId },
        data: { status: 'AVAILABLE' }
      });
    }
  }
  
  // If status is changing to IN_PROGRESS, update room status to MAINTENANCE
  if (input.status === 'IN_PROGRESS' && maintenanceEvent.status !== 'IN_PROGRESS') {
    await ctx.prisma.room.update({
      where: { id: maintenanceEvent.roomId },
      data: { status: 'MAINTENANCE' }
    });
  }
} 