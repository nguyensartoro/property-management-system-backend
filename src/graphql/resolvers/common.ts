import { GraphQLContext } from '../context';

// Interface defining paginated results
export interface PaginatedResult<T> {
  nodes: T[];
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    totalPages: number;
    totalCount: number;
    currentPage: number;
  };
}

// Function to safely get user ID for logging
export function getUserId(ctx: GraphQLContext): string {
  if (ctx.user && 'id' in ctx.user) {
    return ctx.user.id;
  }
  return 'unauthenticated';
}

// Calculate pagination details
export function calculatePagination<T>(
  page: number,
  limit: number,
  totalCount: number,
  items: T[]
): PaginatedResult<T> {
  const totalPages = Math.ceil(totalCount / limit);
  
  return {
    nodes: items,
    pageInfo: {
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  };
} 