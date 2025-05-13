import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Initialize Prisma client (using dependency injection pattern)
const prisma = new PrismaClient();

// User interface for auth context
export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // This is derived from userRoles relation
}

// Context type for GraphQL resolvers
export interface GraphQLContext {
  prisma: PrismaClient;
  userId?: string; // For authenticated users
  isAdmin?: boolean;
  user?: User; // Full user object if authenticated
  req: any; // Request object
}

// Create context for each GraphQL request
export const createContext = async ({ req }: { req: any }): Promise<GraphQLContext> => {
  // Basic context with database access
  const context: GraphQLContext = {
    prisma,
    req
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

        // Fetch the user from database with their roles
        const dbUser = await prisma.user.findUnique({
          where: { id: decoded.userId },
          include: {
            userRoles: {
              include: {
                role: true
              }
            }
          }
        });

        if (dbUser) {
          // Determine the user's primary role
          let roleName = 'USER'; // Default role
          
          if (dbUser.userRoles && dbUser.userRoles.length > 0) {
            // Get the first role (could be more sophisticated if users have multiple roles)
            roleName = dbUser.userRoles[0].role.name;
          }
          
          // Create user object with determined role
          context.user = {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            role: roleName
          };
          
          // Set admin flag
          context.isAdmin = roleName === 'ADMIN';
        }
      } catch (error) {
        // Token verification failed, user will not be added to context
        console.error('Token verification failed:', error);
      }
    }
  }

  return context;
};