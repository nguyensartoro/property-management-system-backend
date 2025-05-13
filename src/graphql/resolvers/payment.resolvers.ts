import { GraphQLContext } from '../context';
import { resolverLogger } from '../../utils/resolverLogger';
import { calculatePagination, getUserId } from './common';
import { Payment, Prisma, PaymentStatus } from '@prisma/client';

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

// Payment resolvers
export const paymentResolvers = {
  Query: {
    // Get a single payment by ID
    payment: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      const resolverName = 'payment';
      try {
        resolverLogger.log(resolverName, { id }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to view payment details');
        }

        const payment = await ctx.prisma.payment.findUnique({
          where: { id },
          include: {
            renter: true,
            contract: true
          }
        });

        if (!payment) {
          throw new Error('Payment not found');
        }

        return payment;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Get a list of payments with pagination and filtering
    payments: async (
      _: any,
      {
        page = 1,
        limit = 10,
        renterId,
        contractId,
        status,
        fromDate,
        toDate,
        sortBy = 'dueDate',
        sortOrder = 'desc',
      }: {
        page?: number;
        limit?: number;
        renterId?: string;
        contractId?: string;
        status?: string;
        fromDate?: string;
        toDate?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
      },
      ctx: GraphQLContext
    ) => {
      const resolverName = 'payments';
      try {
        resolverLogger.log(
          resolverName,
          { page, limit, renterId, contractId, status, fromDate, toDate },
          getUserId(ctx)
        );

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to view payments');
        }

        // Build where clause for filters
        const where: Prisma.PaymentWhereInput = {
          ...(renterId && { renterId }),
          ...(contractId && { contractId }),
          ...(status && { status: status as PaymentStatus }),
          ...(fromDate || toDate) && {
            dueDate: {
              ...(fromDate && { gte: new Date(fromDate) }),
              ...(toDate && { lte: new Date(toDate) })
            }
          }
        };

        // Get total count for pagination
        const totalCount = await ctx.prisma.payment.count({ where });

        // Get payments with pagination, sorting, and filtering
        const payments = await ctx.prisma.payment.findMany({
          skip: (page - 1) * limit,
          take: limit,
          where,
          orderBy: { [sortBy]: sortOrder },
          include: {
            renter: true,
            contract: true
          }
        });

        // Return paginated result
        const result = calculatePagination(page, limit, totalCount, payments);

        resolverLogger.log(resolverName, { total: totalCount });
        return result;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },
  },

  Mutation: {
    // Create a new payment
    createPayment: async (_: any, { input }: { input: any }, ctx: GraphQLContext) => {
      const resolverName = 'createPayment';
      try {
        resolverLogger.log(resolverName, { input }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to create a payment');
        }

        // Validate required fields
        const requiredFields = [
          { field: 'amount', message: 'Amount is required' },
          { field: 'dueDate', message: 'Due date is required' },
          { field: 'renterId', message: 'Renter ID is required' },
          { field: 'status', message: 'Status is required' }
        ];

        for (const { field, message } of requiredFields) {
          if (!input[field] && input[field] !== 0) {
            throw new Error(message);
          }
        }

        // Ensure status is a valid PaymentStatus
        if (input.status) {
          input.status = input.status as PaymentStatus;
        }

        // Check if renter exists
        const renter = await ctx.prisma.renter.findUnique({
          where: { id: input.renterId }
        });

        if (!renter) {
          throw new Error('Renter not found');
        }

        // If contract ID is provided, check if it exists
        if (input.contractId) {
          const contract = await ctx.prisma.contract.findUnique({
            where: { id: input.contractId }
          });

          if (!contract) {
            throw new Error('Contract not found');
          }

          // Verify the contract belongs to the renter
          let contractWithRenters = contract as any;
          if (!contractWithRenters.renters) {
            contractWithRenters = await ctx.prisma.contract.findUnique({ where: { id: contract.id }, include: { renters: true } });
          }
          if (!contractWithRenters.renters.some((r: any) => r.id === input.renterId)) {
            throw new Error('Contract does not belong to the specified renter');
          }
        }

        // Create the payment
        const payment = await ctx.prisma.payment.create({
          data: input,
          include: {
            renter: true,
            contract: true
          }
        });

        resolverLogger.log(resolverName, { created: payment.id });
        return payment;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Update an existing payment
    updatePayment: async (
      _: any,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext
    ) => {
      const resolverName = 'updatePayment';
      try {
        resolverLogger.log(resolverName, { id, input }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to update a payment');
        }

        // Check if payment exists
        const payment = await ctx.prisma.payment.findUnique({
          where: { id }
        });

        if (!payment) {
          throw new Error('Payment not found');
        }

        // Ensure status is a valid PaymentStatus if provided
        if (input.status) {
          input.status = input.status as PaymentStatus;
        }

        // If changing renter, verify the new renter exists
        if (input.renterId && input.renterId !== payment.renterId) {
          const renter = await ctx.prisma.renter.findUnique({
            where: { id: input.renterId }
          });

          if (!renter) {
            throw new Error('Renter not found');
          }
        }

        // If changing contract, check if it exists and belongs to the correct renter
        if (input.contractId && input.contractId !== payment.contractId) {
          const contract = await ctx.prisma.contract.findUnique({
            where: { id: input.contractId }
          });

          if (!contract) {
            throw new Error('Contract not found');
          }

          // If renter is not changing, verify the contract belongs to the current renter
          const renterId = input.renterId || payment.renterId;
          let contractWithRenters = contract as any;
          if (!contractWithRenters.renters) {
            contractWithRenters = await ctx.prisma.contract.findUnique({ where: { id: contract.id }, include: { renters: true } });
          }
          if (!contractWithRenters.renters.some((r: any) => r.id === renterId)) {
            throw new Error('Contract does not belong to the renter');
          }
        }

        // Update the payment
        const updatedPayment = await ctx.prisma.payment.update({
          where: { id },
          data: input,
          include: {
            renter: true,
            contract: true
          }
        });

        resolverLogger.log(resolverName, { updated: id });
        return updatedPayment;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Delete a payment
    deletePayment: async (_: any, { id }: { id: string }, ctx: GraphQLContext) => {
      const resolverName = 'deletePayment';
      try {
        resolverLogger.log(resolverName, { id }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to delete a payment');
        }

        // Check if payment exists
        const payment = await ctx.prisma.payment.findUnique({
          where: { id }
        });

        if (!payment) {
          throw new Error('Payment not found');
        }

        // Don't allow deletion of paid payments
        if (payment.status === 'PAID') {
          throw new Error('Cannot delete a payment that has been paid. Change its status instead.');
        }

        // Delete the payment
        await ctx.prisma.payment.delete({
          where: { id }
        });

        resolverLogger.log(resolverName, { deleted: id });
        return true;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },

    // Mark payment as paid
    markPaymentAsPaid: async (
      _: any,
      {
        id,
        paidDate = new Date(),
        reference
      }: {
        id: string;
        paidDate?: Date;
        reference?: string;
      },
      ctx: GraphQLContext
    ) => {
      const resolverName = 'markPaymentAsPaid';
      try {
        resolverLogger.log(resolverName, { id, paidDate, reference }, getUserId(ctx));

        // Check authentication
        if (!ctx.user) {
          throw new Error('You must be authenticated to mark a payment as paid');
        }

        // Check if payment exists
        const payment = await ctx.prisma.payment.findUnique({
          where: { id }
        });

        if (!payment) {
          throw new Error('Payment not found');
        }

        // If already paid, don't change anything
        if (payment.status === 'PAID') {
          throw new Error('Payment has already been marked as paid');
        }

        // Update the payment
        const updatedPayment = await ctx.prisma.payment.update({
          where: { id },
          data: {
            status: 'PAID' as PaymentStatus,
            paidDate,
            description: reference || payment.description
          },
          include: {
            renter: true,
            contract: true
          }
        });

        resolverLogger.log(resolverName, { paid: id });
        return updatedPayment;
      } catch (error) {
        resolverLogger.error(resolverName, error);
        throw error;
      }
    },
  },

  // Payment type resolvers
  Payment: {
    // Resolver for renter field
    renter: async (parent: Payment, _: any, ctx: GraphQLContext) => {
      if (!parent.renterId) return null;
      return ctx.prisma.renter.findUnique({
        where: { id: parent.renterId }
      });
    },

    // Resolver for contract field
    contract: async (parent: Payment, _: any, ctx: GraphQLContext) => {
      if (!parent.contractId) return null;
      return ctx.prisma.contract.findUnique({
        where: { id: parent.contractId }
      });
    },
  },
};