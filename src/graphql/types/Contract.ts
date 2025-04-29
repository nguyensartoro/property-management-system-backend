import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLFloat, GraphQLList } from 'graphql';
import { dateTimeScalar } from '../scalars';

// Contract type definition
export const ContractType = new GraphQLObjectType({
  name: 'Contract',
  description: 'Rental contract or agreement',
  fields: () => {
    // Import types here to avoid circular dependencies
    const { RoomType } = require('./Room');
    const { RenterType } = require('./Renter');
    const { PaymentType } = require('./Payment');
    
    return {
      id: { type: new GraphQLNonNull(GraphQLID) },
      renterId: { type: new GraphQLNonNull(GraphQLID) },
      roomId: { type: new GraphQLNonNull(GraphQLID) },
      startDate: { type: new GraphQLNonNull(dateTimeScalar) },
      endDate: { type: new GraphQLNonNull(dateTimeScalar) },
      contractType: { type: new GraphQLNonNull(GraphQLString) },
      amount: { type: new GraphQLNonNull(GraphQLFloat) },
      status: { type: new GraphQLNonNull(GraphQLString) },
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
      
      // Resolver for room
      room: {
        type: RoomType,
        resolve: async (parent, args, ctx) => {
          return ctx.prisma.room.findUnique({
            where: { id: parent.roomId }
          });
        },
      },
      
      // Resolver for payments
      payments: {
        type: new GraphQLList(PaymentType),
        resolve: async (parent, args, ctx) => {
          return ctx.prisma.payment.findMany({
            where: { contractId: parent.id }
          });
        },
      },
    };
  },
}); 