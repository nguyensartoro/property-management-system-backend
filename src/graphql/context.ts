import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import jwt from 'jsonwebtoken';

// Create a new Prisma client instance
const prisma = new PrismaClient();

// Define user interface
export interface User {
  id: string;
  email: string;
  role: 'USER' | 'PROPERTY_MANAGER' | 'ADMIN';
}

// Define GraphQL context interface
export interface GraphQLContext {
  prisma: PrismaClient;
  user: User | null;
  req: Request;
}

// Extract token from request headers
const getToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const [bearer, token] = authHeader.split(' ');

  if (bearer !== 'Bearer' || !token) {
    return null;
  }

  return token;
};

// Verify JWT token and get user
const getUserFromToken = async (token: string, prisma: PrismaClient): Promise<User | null> => {
  try {
    // Use the same secret and fallback as token generation
    const jwtSecret = process.env.JWT_SECRET || 'default_secret';

    const decoded = jwt.verify(token, jwtSecret) as { userId: string };

    if (!decoded.userId) {
      return null;
    }

    // Find user in database with their roles
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    // Get the primary role (or default to 'USER')
    let role: 'USER' | 'PROPERTY_MANAGER' | 'ADMIN' = 'USER';
    if (user.userRoles && user.userRoles.length > 0) {
      const primaryRole = user.userRoles[0].role.name;
      if (primaryRole === 'ADMIN' || primaryRole === 'PROPERTY_MANAGER') {
        role = primaryRole;
      }
    }

    return {
      id: user.id,
      email: user.email,
      role: role
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
};

// Create context for each request
export const createContext = async ({ req }: { req: Request }): Promise<GraphQLContext> => {
  const token = getToken(req);
  const user = token ? await getUserFromToken(token, prisma) : null;

  return {
    prisma,
    user,
    req
  };
};

// Export Prisma client for use outside of GraphQL context
export { prisma };