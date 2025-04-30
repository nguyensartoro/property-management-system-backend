import { GraphQLContext } from '../context';
import { resolverLogger } from '../../utils/resolverLogger';
import { calculatePagination, getUserId } from './common';
import { Prisma } from '@prisma/client';

// Property resolvers
export const propertyResolvers = {
  Query: {
    // Get a single property by ID
    property: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      const resolverName = 'property';
      try {
        resolverLogger.log(resolverName, { id }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to view property details');
        }

        const property = await ctx.prisma.property.findUnique({
          where: { id },
          include: {
            rooms: true,
            user: true
          }
        });

        if (!property) {
          throw new Error('Property not found');
        }

        return property;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Get a list of properties with pagination and filtering
    properties: async (
      _: any,
      {
        page = 1,
        limit = 10,
        search,
        userId,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      }: {
        page?: number;
        limit?: number;
        search?: string;
        userId?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      },
      ctx: GraphQLContext
    ) => {
      const resolverName = 'properties';
      try {
        resolverLogger.log(resolverName, {
          page, limit, search, userId
        }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to view properties');
        }

        // Build where clause for filters
        let where: Prisma.PropertyWhereInput = {};

        if (userId) {
          where.userId = userId;
        }

        if (search) {
          where = {
            ...where,
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { address: { contains: search, mode: 'insensitive' } }
            ] as Prisma.PropertyWhereInput['OR']
          };
        }

        // Get total count for pagination
        const totalCount = await ctx.prisma.property.count({ where });

        // Get properties with pagination, sorting, and filtering
        const properties = await ctx.prisma.property.findMany({
          skip: (page - 1) * limit,
          take: limit,
          where,
          orderBy: { [sortBy]: sortOrder },
          include: {
            rooms: true,
            user: true,
            _count: {
              select: {
                rooms: true
              }
            }
          }
        });

        // Return paginated result
        const result = calculatePagination(page, limit, totalCount, properties);

        resolverLogger.log(resolverName, { total: totalCount });
        return result;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },
  },

  Mutation: {
    // Create a new property
    createProperty: async (_: any, { input }: { input: any }, ctx: GraphQLContext) => {
      const resolverName = 'createProperty';
      try {
        resolverLogger.log(resolverName, { input }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to create a property');
        }

        // Validate required fields
        const requiredFields = [
          { field: 'name', message: 'Name is required' },
          { field: 'address', message: 'Address is required' },
        ];

        for (const { field, message } of requiredFields) {
          if (!input[field]) {
            throw new Error(message);
          }
        }

        // Set user to current user if not specified
        if (!input.userId && ctx.user.id) {
          input.userId = ctx.user.id;
        }

        // Create the property
        const property = await ctx.prisma.property.create({
          data: input,
          include: {
            rooms: true,
            user: true
          }
        });

        resolverLogger.log(resolverName, { created: property.id });
        return property;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Update an existing property
    updateProperty: async (
      _: any,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const resolverName = 'updateProperty';
      try {
        resolverLogger.log(resolverName, { id, input }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to update a property');
        }

        // Check if property exists
        const existingProperty = await ctx.prisma.property.findUnique({
          where: { id },
          include: { user: true }
        });

        if (!existingProperty) {
          throw new Error('Property not found');
        }

        // Check if user has permission (owns the property or is admin)
        const isAdmin = ctx.user.role === 'ADMIN';
        const isOwner = existingProperty.userId === ctx.user.id;

        if (!isAdmin && !isOwner) {
          throw new Error('You do not have permission to update this property');
        }

        // Update the property
        const updatedProperty = await ctx.prisma.property.update({
          where: { id },
          data: input,
          include: {
            rooms: true,
            user: true
          }
        });

        resolverLogger.log(resolverName, { updated: id });
        return updatedProperty;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Delete a property
    deleteProperty: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      const resolverName = 'deleteProperty';
      try {
        resolverLogger.log(resolverName, { id }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to delete a property');
        }

        // Check if property exists
        const existingProperty = await ctx.prisma.property.findUnique({
          where: { id },
          include: { user: true, rooms: true }
        });

        if (!existingProperty) {
          throw new Error('Property not found');
        }

        // Check if user has permission (owns the property or is admin)
        const isAdmin = ctx.user.role === 'ADMIN';
        const isOwner = existingProperty.userId === ctx.user.id;

        if (!isAdmin && !isOwner) {
          throw new Error('You do not have permission to delete this property');
        }

        // Check if property has active rooms
        if (existingProperty.rooms && existingProperty.rooms.length > 0) {
          const activeRooms = existingProperty.rooms.filter(
            (room: any) => room.status === 'OCCUPIED' || room.status === 'RESERVED'
          );

          if (activeRooms.length > 0) {
            throw new Error('Cannot delete property with active rooms. Please remove all rooms first.');
          }
        }

        // Delete the property
        await ctx.prisma.property.delete({
          where: { id }
        });

        resolverLogger.log(resolverName, { deleted: id });
        return { id, success: true, message: 'Property deleted successfully' };
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },
  },

  // Property type resolvers
  Property: {
    // Resolver for user field
    user: async (parent: any, _: any, ctx: GraphQLContext) => {
      if (parent.user) {
        return parent.user;
      }
      return ctx.prisma.user.findUnique({
        where: { id: parent.userId }
      });
    },

    // Resolver for rooms field
    rooms: async (parent: any, _: any, ctx: GraphQLContext) => {
      return ctx.prisma.room.findMany({
        where: { propertyId: parent.id }
      });
    },

    // Resolver for roomCount field
    roomCount: async (parent: any, _: any, ctx: GraphQLContext) => {
      const count = await ctx.prisma.room.count({
        where: { propertyId: parent.id }
      });
      return count;
    },

    // Resolver for vacant room count
    vacantRoomCount: async (parent: any, _: any, ctx: GraphQLContext) => {
      const count = await ctx.prisma.room.count({
        where: {
          propertyId: parent.id,
          status: 'AVAILABLE'
        }
      });
      return count;
    },

    // Resolver for occupied room count
    occupiedRoomCount: async (parent: any, _: any, ctx: GraphQLContext) => {
      const count = await ctx.prisma.room.count({
        where: {
          propertyId: parent.id,
          status: 'OCCUPIED'
        }
      });
      return count;
    },
  },
};