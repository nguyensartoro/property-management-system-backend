import { GraphQLScalarType, Kind } from 'graphql';

// DateTime scalar for handling date objects in GraphQL
export const dateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Date custom scalar type',
  
  // Convert outgoing Date to ISO string
  serialize(value) {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  },
  
  // Convert incoming ISO string to Date
  parseValue(value) {
    if (typeof value === 'string') {
      return new Date(value);
    }
    return null;
  },
  
  // Parse AST literal to Date
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

// JSON scalar for handling JSON objects
export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'The JSON scalar type represents JSON objects as JSON strings',
  
  serialize(value) {
    return JSON.stringify(value);
  },
  
  parseValue(value) {
    return typeof value === 'string' ? JSON.parse(value) : value;
  },
  
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return JSON.parse(ast.value);
    }
    return null;
  },
});

// Export all scalars
export const scalars = {
  DateTime: dateTimeScalar,
  JSON: JSONScalar
}; 