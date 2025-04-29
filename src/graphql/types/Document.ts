import { GraphQLID, GraphQLObjectType, GraphQLString, GraphQLNonNull } from 'graphql';
import { dateTimeScalar } from '../scalars';

// Document type definition
export const DocumentType = new GraphQLObjectType({
  name: 'Document',
  description: 'Renter document or attachment',
  fields: () => {
    // Import types here to avoid circular dependencies
    const { RenterType } = require('./Renter');
    
    return {
      id: { type: new GraphQLNonNull(GraphQLID) },
      name: { type: new GraphQLNonNull(GraphQLString) },
      type: { type: new GraphQLNonNull(GraphQLString) },
      fileUrl: { type: new GraphQLNonNull(GraphQLString) },
      description: { type: GraphQLString },
      renterId: { type: new GraphQLNonNull(GraphQLID) },
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
    };
  },
}); 