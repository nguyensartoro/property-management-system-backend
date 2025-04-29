import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLList } from 'graphql';
import { dateTimeScalar } from '../scalars';

// Renter type definition
export const RenterType = new GraphQLObjectType({
  name: 'Renter',
  description: 'Person renting a room',
  fields: () => {
    // Import types here to avoid circular dependencies
    const { RoomType } = require('./Room');
    const { DocumentType } = require('./Document');
    const { ContractType } = require('./Contract');
    const { PaymentType } = require('./Payment');
    
    return {
      id: { type: new GraphQLNonNull(GraphQLID) },
      name: { type: new GraphQLNonNull(GraphQLString) },
      email: { type: GraphQLString },
      phone: { type: new GraphQLNonNull(GraphQLString) },
      emergencyContact: { type: GraphQLString },
      identityNumber: { type: GraphQLString },
      roomId: { type: GraphQLID },
      createdAt: { type: new GraphQLNonNull(dateTimeScalar) },
      updatedAt: { type: new GraphQLNonNull(dateTimeScalar) },
      
      // Resolver for room
      room: {
        type: RoomType,
        resolve: async (parent, args, ctx) => {
          if (!parent.roomId) return null;
          return ctx.prisma.room.findUnique({
            where: { id: parent.roomId }
          });
        },
      },
      
      // Resolver for documents
      documents: {
        type: new GraphQLList(DocumentType),
        resolve: async (parent, args, ctx) => {
          return ctx.prisma.document.findMany({
            where: { renterId: parent.id }
          });
        },
      },
      
      // Resolver for contracts
      contracts: {
        type: new GraphQLList(ContractType),
        resolve: async (parent, args, ctx) => {
          return ctx.prisma.contract.findMany({
            where: { renterId: parent.id }
          });
        },
      },
      
      // Resolver for payments
      payments: {
        type: new GraphQLList(PaymentType),
        resolve: async (parent, args, ctx) => {
          return ctx.prisma.payment.findMany({
            where: { renterId: parent.id }
          });
        },
      },
    };
  },
}); 