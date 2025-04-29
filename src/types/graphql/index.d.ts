// GraphQL type declarations
declare module 'graphql-depth-limit' {
  import { ValidationContext } from 'graphql';
  export default function depthLimit(maxDepth: number): (validationContext: ValidationContext) => any;
}

// Ensure require statements work in TypeScript
declare function require(id: string): any; 