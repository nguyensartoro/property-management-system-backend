import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLFloat } from 'graphql';
import { dateTimeScalar } from '../scalars';

// Payment type definition
export const PaymentType = new GraphQLObjectType({
  name: 'Payment',
  description: 'Rent payment record',
  fields: () => {
    // Import types here to avoid circular dependencies
    const { RenterType } = require('./Renter');
    const { ContractType } = require('./Contract');
    
    return {
      id: { type: new GraphQLNonNull(GraphQLID) },
      renterId: { type: new GraphQLNonNull(GraphQLID) },
      contractId: { type: GraphQLID },
      amount: { type: new GraphQLNonNull(GraphQLFloat) },
      status: { type: new GraphQLNonNull(GraphQLString) },
      paymentDate: { type: new GraphQLNonNull(dateTimeScalar) },
      dueDate: { type: new GraphQLNonNull(dateTimeScalar) },
      method: { type: GraphQLString },
      createdAt: { type: new GraphQLNonNull(dateTimeScalar) },
      updatedAt: { type: new GraphQLNonNull(dateTimeScalar) },
      
      // Resolver for renter
      renter: {
        type: RenterType,
        resolve: async (parent, args, ctx) => {
          return ctx.prisma.renter.findUnique({
            where: { id: parent.renterId }
          });
        },
      },
      
      // Resolver for contract
      contract: {
        type: ContractType,
        resolve: async (parent, args, ctx) => {
          if (!parent.contractId) return null;
          return ctx.prisma.contract.findUnique({
            where: { id: parent.contractId }
          });
        },
      },
    };
  },
}); 