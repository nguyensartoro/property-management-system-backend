import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Initialize Prisma client (using dependency injection pattern)
const prisma = new PrismaClient();

// User interface for auth context
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Context type for GraphQL resolvers
export interface GraphQLContext {
  prisma: PrismaClient;
  userId?: string; // For authenticated users
  isAdmin?: boolean;
  user?: User; // Full user object if authenticated
}

// Create context for each GraphQL request
export const createContext = async ({ req }: { req: any }): Promise<GraphQLContext> => {
  // Basic context with database access
  const context: GraphQLContext = {
    prisma,
  };

  // Add authentication info to context (if available)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    if (token) {
      try {
        // Verify the token
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'default_secret'
        ) as { userId: string };

        // Set userId in context
        context.userId = decoded.userId;

        // Fetch the user from database
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        });

        if (user) {
          context.user = user;
          context.isAdmin = user.role === 'ADMIN';
        }
      } catch (error) {
        // Token verification failed, user will not be added to context
        console.error('Token verification failed:', error);
      }
    }
  }

  return context;
};