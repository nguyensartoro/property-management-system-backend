declare module 'graphql-depth-limit' {
  import { ValidationContext } from 'graphql';
  export default function depthLimit(maxDepth: number): (validationContext: ValidationContext) => any;
} 