import { GraphQLContext } from '../context';
import { resolverLogger } from '../../utils/resolverLogger';
import { calculatePagination, getUserId } from './common';
import { Prisma, Service, FeeType } from '@prisma/client';

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

// Service resolvers
export const serviceResolvers = {
  Query: {
    // Get a single service by ID
    service: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      const resolverName = 'service';
      try {
        resolverLogger.log(resolverName, { id }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to view service details');
        }

        const service = await ctx.prisma.service.findUnique({
          where: { id }
        });

        if (!service) {
          throw new Error('Service not found');
        }

        return service;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Get a list of services with pagination and filtering
    services: async (
      _: any,
      {
        page = 1,
        limit = 10,
        search,
        feeType,
        sortBy = 'name',
        sortOrder = 'asc',
      }: {
        page?: number;
        limit?: number;
        search?: string;
        feeType?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      },
      ctx: GraphQLContext
    ) => {
      const resolverName = 'services';
      try {
        resolverLogger.log(resolverName, { 
          page, limit, search, feeType, sortBy, sortOrder 
        }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to view services');
        }

        // Build where clause for filters
        const where: Prisma.ServiceWhereInput = {
          ...(feeType && { feeType: feeType as FeeType }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } }
            ]
          })
        };

        // Get total count for pagination
        const totalCount = await ctx.prisma.service.count({ where });

        // Get services with pagination, sorting, and filtering
        const services = await ctx.prisma.service.findMany({
          skip: (page - 1) * limit,
          take: limit,
          where,
          orderBy: { [sortBy]: sortOrder }
        });

        // Return paginated result
        const result = calculatePagination(page, limit, totalCount, services);

        resolverLogger.log(resolverName, { total: totalCount });
        return result;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },
  },

  Mutation: {
    // Create a new service
    createService: async (_: any, { input }: { input: any }, ctx: GraphQLContext) => {
      const resolverName = 'createService';
      try {
        resolverLogger.log(resolverName, { input }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to create a service');
        }

        // Check for admin role
        if (ctx.user.role !== 'ADMIN') {
          throw new Error('Only administrators can create services');
        }

        // Validate required fields
        const requiredFields = [
          { field: 'name', message: 'Name is required' },
          { field: 'fee', message: 'Fee is required' },
          { field: 'feeType', message: 'Fee type is required' }
        ];
        
        for (const { field, message } of requiredFields) {
          if (!input[field]) {
            throw new Error(message);
          }
        }

        // Ensure feeType is valid
        if (input.feeType) {
          input.feeType = input.feeType as FeeType;
        }

        // Create the service
        const service = await ctx.prisma.service.create({
          data: input
        });

        resolverLogger.log(resolverName, { created: service.id });
        return service;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Update an existing service
    updateService: async (
      _: any,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const resolverName = 'updateService';
      try {
        resolverLogger.log(resolverName, { id, input }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to update a service');
        }

        // Check for admin role
        if (ctx.user.role !== 'ADMIN') {
          throw new Error('Only administrators can update services');
        }

        // Check if service exists
        const service = await ctx.prisma.service.findUnique({
          where: { id }
        });

        if (!service) {
          throw new Error('Service not found');
        }

        // Ensure feeType is valid if provided
        if (input.feeType) {
          input.feeType = input.feeType as FeeType;
        }

        // Update the service
        const updatedService = await ctx.prisma.service.update({
          where: { id },
          data: input
        });

        resolverLogger.log(resolverName, { updated: id });
        return updatedService;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Delete a service
    deleteService: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      const resolverName = 'deleteService';
      try {
        resolverLogger.log(resolverName, { id }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to delete a service');
        }

        // Check for admin role
        if (ctx.user.role !== 'ADMIN') {
          throw new Error('Only administrators can delete services');
        }

        // Check if service exists
        const service = await ctx.prisma.service.findUnique({
          where: { id }
        });

        if (!service) {
          throw new Error('Service not found');
        }

        // TODO: Check if service is in use (if there's a relationship table)
        // Could check ServiceRooms, ServicePayments, etc.

        // Delete the service
        await ctx.prisma.service.delete({
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

  // Service type resolvers
  Service: {
    // Example of a future resolver if needed
    /*
    transactions: async (parent: Service, _: any, ctx: GraphQLContext) => {
      return ctx.prisma.serviceTransaction.findMany({
        where: { serviceId: parent.id }
      });
    },
    */
  },
}; 