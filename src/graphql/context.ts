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
    // Get JWT secret from environment variables
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return null;
    }
    
    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as { userId: string };
    
    if (!decoded.userId) {
      return null;
    }
    
    // Find user in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      return null;
    }
    
    // Determine role based on user properties
    let role: 'USER' | 'PROPERTY_MANAGER' | 'ADMIN' = 'USER';
    
    // This assumes you have some way to determine roles in your system
    // Modify this logic according to your actual user model structure
    if (user.isRenter === false) {
      role = 'PROPERTY_MANAGER';
    }
    
    // You might have a separate admin flag or another way to determine admin role
    // This is placeholder logic that should be adjusted to your actual data model
    
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