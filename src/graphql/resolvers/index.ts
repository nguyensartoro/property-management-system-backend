import { GraphQLResolveInfo } from 'graphql';
import { GraphQLContext } from '../context';
import { scalars } from '../scalars';
import { roomResolvers } from './room.resolvers';
import { renterResolvers } from './renter.resolvers';
import { documentResolvers } from './document.resolvers';
import { authResolvers } from './auth.resolvers';

// Combine all resolvers
export const resolvers = {
  // Scalars
  ...scalars,
  
  // Root resolvers
  Query: {
    // Auth queries
    ...authResolvers.Query,
    
    // Room queries
    ...roomResolvers.Query,
    
    // Renter queries
    ...renterResolvers.Query,
    
    // Document queries
    ...documentResolvers.Query,
  },
  
  Mutation: {
    // Auth mutations
    ...authResolvers.Mutation,
    
    // Room mutations
    ...roomResolvers.Mutation,
    
    // Renter mutations
    ...renterResolvers.Mutation,
    
    // Document mutations
    ...documentResolvers.Mutation,
  },
  
  // Type resolvers
  Room: roomResolvers.Room,
  Renter: renterResolvers.Renter,
  Document: documentResolvers.Document,
}; 