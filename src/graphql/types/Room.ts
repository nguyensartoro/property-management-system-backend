import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull, GraphQLFloat, GraphQLList } from 'graphql';
import { dateTimeScalar } from '../scalars';

// Room type definition
export const RoomType = new GraphQLObjectType({
  name: 'Room',
  description: 'Rental room or unit in the property',
  fields: () => {
    // Import types here to avoid circular dependencies
    const { RenterType } = require('./Renter');
    const { ContractType } = require('./Contract');
    
    return {
      id: { type: new GraphQLNonNull(GraphQLID) },
      number: { type: new GraphQLNonNull(GraphQLString) },
      name: { type: GraphQLString },
      description: { type: GraphQLString },
      floor: { type: GraphQLString },
      status: { type: new GraphQLNonNull(GraphQLString) },
      price: { type: new GraphQLNonNull(GraphQLFloat) },
      size: { type: GraphQLFloat },
      type: { type: GraphQLString },
      facilities: { type: new GraphQLList(GraphQLString) },
      images: { type: new GraphQLList(GraphQLString) },
      createdAt: { type: new GraphQLNonNull(dateTimeScalar) },
      updatedAt: { type: new GraphQLNonNull(dateTimeScalar) },
      
      // Resolver for renters
      renters: {
        type: new GraphQLList(RenterType),
        resolve: async (parent, args, ctx) => {
          return ctx.prisma.renter.findMany({
            where: { roomId: parent.id }
          });
        },
      },
      
      // Resolver for contracts
      contracts: {
        type: new GraphQLList(ContractType),
        resolve: async (parent, args, ctx) => {
          return ctx.prisma.contract.findMany({
            where: { roomId: parent.id }
          });
        },
      },
    };
  },
}); 