import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLSchema } from 'graphql';
import { typeDefs } from './typeDefs';
import { resolvers } from './resolvers';

// Create the executable schema
let schema: GraphQLSchema;

try {
  // Create the executable schema
  schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });
  
  console.log('GraphQL schema successfully created');
} catch (error) {
  console.error('Failed to create GraphQL schema:', error);
  // Re-throw the error to be handled by the server
  throw error;
}

// Export the schema
export const graphqlSchema = schema; 