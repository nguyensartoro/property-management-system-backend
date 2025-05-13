import { GraphQLContext } from '../context';
import { resolverLogger } from '../../utils/resolverLogger';
import { calculatePagination, getUserId } from './common';
import { Contract, ContractStatus, RoomStatus } from '@prisma/client';
import { nanoid } from 'nanoid';

// Contract resolvers
export const contractResolvers = {
  Query: {
    // Get a single contract by ID
    contract: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      const resolverName = 'contract';
      try {
        resolverLogger.log(resolverName, { id }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to view contract details');
        }

        const contract = await ctx.prisma.contract.findUnique({
          where: { id },
          include: {
            renters: true,
            room: true,
            payments: true
          }
        });

        if (!contract) {
          throw new Error('Contract not found');
        }

        return contract;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Get a list of contracts with pagination and filtering
    contracts: async (
      _: any,
      {
        page = 1,
        limit = 10,
        search,
        roomId,
        renterId,
        status,
        type,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      }: {
        page?: number;
        limit?: number;
        search?: string;
        roomId?: string;
        renterId?: string;
        status?: string;
        type?: string;
        dateFrom?: Date;
        dateTo?: Date;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      },
      ctx: GraphQLContext
    ) => {
      const resolverName = 'contracts';
      try {
        resolverLogger.log(resolverName, {
          page, limit, search, roomId, renterId, status, dateFrom, dateTo
        }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to view contracts');
        }

        // Build where clause for filters
        const where: any = {
          ...(roomId && { roomId }),
          ...(renterId && { renters: { some: { id: renterId } } } ),
          ...(status && { status: status as ContractStatus }),
          ...(type && { type }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { renters: { some: { name: { contains: search, mode: 'insensitive' } } } },
              { room: { number: { contains: search, mode: 'insensitive' } } }
            ],
          }),
        };

        // Add date range filter if provided
        if (dateFrom || dateTo) {
          where.OR = [
            {
              startDate: {
                ...(dateFrom && { gte: dateFrom }),
                ...(dateTo && { lte: dateTo })
              }
            },
            {
              endDate: {
                ...(dateTo && { lte: dateTo }),
                ...(dateFrom && { gte: dateFrom })
              }
            }
          ];
        }

        // Get total count for pagination
        const totalCount = await ctx.prisma.contract.count({ where });

        // Get contracts with pagination, sorting, and filtering
        const contracts = await ctx.prisma.contract.findMany({
          skip: (page - 1) * limit,
          take: limit,
          where,
          orderBy: { [sortBy]: sortOrder },
          include: {
            renters: true,
            room: true,
            payments: true
          }
        });

        // Return paginated result
        const result = calculatePagination(page, limit, totalCount, contracts);

        resolverLogger.log(resolverName, { total: totalCount });
        return result;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },
  },

  Mutation: {
    // Create a new contract
    createContract: async (_: any, { input }: { input: any }, ctx: GraphQLContext) => {
      const resolverName = 'createContract';
      try {
        resolverLogger.log(resolverName, { input }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to create a contract');
        }

        // Validate required fields
        const requiredFields = [
          { field: 'name', message: 'Name is required' },
          { field: 'renterIds', message: 'Renter is required' },
          { field: 'roomId', message: 'Room is required' },
          { field: 'startDate', message: 'Start date is required' },
          { field: 'endDate', message: 'End date is required' },
          { field: 'amount', message: 'Amount is required' },
        ];

        for (const { field, message } of requiredFields) {
          if (!input[field]) {
            throw new Error(message);
          }
        }

        // Validate input, permissions, etc.
        if (!input.renterIds || !Array.isArray(input.renterIds) || input.renterIds.length === 0) {
          throw new Error('At least one renter is required');
        }

        // Handle contract creation with transaction to ensure room status is updated together
        const contract = await ctx.prisma.$transaction(async (prisma) => {
          // Check if room exists and is available
          const room = await prisma.room.findUnique({
            where: { id: input.roomId }
          });

          if (!room) {
            throw new Error('Room not found');
          }

          if (room.status !== 'AVAILABLE') {
            throw new Error(`Room is currently ${room.status.toLowerCase()}`);
          }

          // Check if renters exist
          const renters = await prisma.renter.findMany({
            where: { id: { in: input.renterIds } }
          });

          if (renters.length !== input.renterIds.length) {
            throw new Error('One or more renters not found');
          }

          // Update room status to OCCUPIED
          await prisma.room.update({
            where: { id: input.roomId },
            data: {
              status: 'OCCUPIED' as RoomStatus
            }
          });

          // Create the contract
          const createdContract = await prisma.contract.create({
            data: {
              id: nanoid(),
              ...input,
              updatedAt: new Date(),
              renters: {
                connect: input.renterIds.map((id: string) => ({ id })),
              },
            },
            include: {
              renters: true,
              room: true
            }
          });

          return createdContract;
        });

        resolverLogger.log(resolverName, { created: contract.id });
        return contract;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Update an existing contract
    updateContract: async (
      _: any,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const resolverName = 'updateContract';
      try {
        resolverLogger.log(resolverName, { id, input }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to update a contract');
        }

        // Check if contract exists
        const existingContract = await ctx.prisma.contract.findUnique({
          where: { id },
          include: { renters: true, room: true }
        });

        if (!existingContract) {
          throw new Error('Contract not found');
        }

        // Handle contract update with transaction to ensure room status is updated together
        const updatedContract = await ctx.prisma.$transaction(async (prisma) => {
          // Update the contract
          const updated = await prisma.contract.update({
            where: { id },
            data: input,
            include: {
              renters: true,
              room: true
            }
          });

          // Handle room status changes if contract status changes
          if (input.status === 'TERMINATED' || input.status === 'EXPIRED') {
            // Check if this is the active contract for the room
            const isActiveContractForRoom = await prisma.contract.count({
              where: {
                id: { not: id },
                roomId: updated.roomId,
                renters: { some: { id: { in: updated.renters.map(r => r.id) } } }
              }
            }) === 0;

            // If this was the active contract, set room to AVAILABLE
            if (isActiveContractForRoom) {
              await prisma.room.update({
                where: { id: updated.roomId },
                data: {
                  status: 'AVAILABLE' as RoomStatus
                }
              });
            }
          }

          return updated;
        });

        resolverLogger.log(resolverName, { updated: id });
        return updatedContract;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Delete a contract
    deleteContract: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      const resolverName = 'deleteContract';
      try {
        resolverLogger.log(resolverName, { id }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to delete a contract');
        }

        // Check if contract exists
        const contract = await ctx.prisma.contract.findUnique({
          where: { id },
          include: { payments: true }
        });

        if (!contract) {
          throw new Error('Contract not found');
        }

        // Check if contract has payments
        if (contract.payments.length > 0) {
          throw new Error('Cannot delete a contract with associated payments. Terminate it instead.');
        }

        // Delete contract
        await ctx.prisma.contract.delete({
          where: { id }
        });

        resolverLogger.log(resolverName, { deleted: id });
        return true;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Terminate a contract
    terminateContract: async (
      _: any,
      {
        id,
        reason,
        terminationDate = new Date()
      }: {
        id: string;
        reason?: string;
        terminationDate?: Date;
      },
      ctx: GraphQLContext
    ) => {
      const resolverName = 'terminateContract';
      try {
        resolverLogger.log(resolverName, { id, reason, terminationDate }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to terminate a contract');
        }

        // Validate reason
        if (!reason) {
          throw new Error('Termination reason is required');
        }

        // Check if contract exists
        const contract = await ctx.prisma.contract.findUnique({
          where: { id },
          include: {
            renters: true,
            room: true
          }
        });

        if (!contract) {
          throw new Error('Contract not found');
        }

        // Cannot terminate already terminated or expired contracts
        if (contract.status === 'TERMINATED' || contract.status === 'EXPIRED') {
          throw new Error(`Contract is already ${contract.status.toLowerCase()}`);
        }

        // Terminate contract transaction
        const terminatedContract = await ctx.prisma.$transaction(async (prisma) => {
          // Update the contract
          const updated = await prisma.contract.update({
            where: { id },
            data: {
              status: 'TERMINATED' as ContractStatus,
              terminationReason: reason,
              terminationDate
            },
            include: {
              renters: true,
              room: true
            }
          });

          // Check if this is the active contract for the room
          const isActiveContractForRoom = await prisma.contract.count({
            where: {
              id: { not: id },
              roomId: contract.roomId,
              renters: { some: { id: { in: updated.renters.map(r => r.id) } } }
            }
          }) === 0;

          // If this was the active contract, set room to AVAILABLE
          if (isActiveContractForRoom) {
            await prisma.room.update({
              where: { id: contract.roomId },
              data: {
                status: 'AVAILABLE' as RoomStatus
              }
            });
          }

          return updated;
        });

        resolverLogger.log(resolverName, { terminated: id, reason });
        return terminatedContract;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },
  },

  // Contract type resolvers
  Contract: {
    renters: async (parent: any, _: any, ctx: GraphQLContext) => {
      return ctx.prisma.contract
        .findUnique({ where: { id: parent.id } })
        .renters();
    },

    // Resolver for room field
    room: async (parent: Contract, _: any, ctx: GraphQLContext) => {
      if (!parent.roomId) return null;
      return ctx.prisma.room.findUnique({
        where: { id: parent.roomId }
      });
    },

    // Resolver for documents field - get documents via renter
    documents: async (parent: Contract, _: any, ctx: GraphQLContext) => {
      let renterIds: string[] = [];
      const parentWithRenters = parent as any;
      if (parentWithRenters.renters && Array.isArray(parentWithRenters.renters) && parentWithRenters.renters.length > 0) {
        renterIds = parentWithRenters.renters.map((r: any) => r.id);
      } else {
        // Fetch contract with renters if not already populated
        const contractWithRenters = await ctx.prisma.contract.findUnique({
          where: { id: parent.id },
          include: { renters: true }
        });
        if (contractWithRenters && contractWithRenters.renters.length > 0) {
          renterIds = contractWithRenters.renters.map((r: any) => r.id);
        }
      }
      if (renterIds.length === 0) return [];
      return ctx.prisma.document.findMany({
        where: { renterId: { in: renterIds } }
      });
    },

    // Resolver for payments field
    payments: async (parent: Contract, _: any, ctx: GraphQLContext) => {
      return ctx.prisma.payment.findMany({
        where: { contractId: parent.id }
      });
    },
  },
};