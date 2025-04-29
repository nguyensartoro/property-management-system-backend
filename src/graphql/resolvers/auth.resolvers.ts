import { GraphQLContext } from '../context';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';

// Authentication resolvers
export const authResolvers = {
  Mutation: {
    // Login mutation
    login: async (
      _: any,
      { email, password }: { email: string; password: string },
      ctx: GraphQLContext
    ) => {
      try {
        // Find user by email
        const user = await ctx.prisma.user.findUnique({
          where: { email },
        });

        // Check if user exists
        if (!user) {
          throw new Error('Invalid credentials');
        }

        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          throw new Error('Invalid credentials');
        }

        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET || 'default_secret',
          { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
        );

        // Generate refresh token
        const refreshToken = jwt.sign(
          { userId: user.id },
          process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
          { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as SignOptions
        );

        // Return user and tokens
        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          token,
          refreshToken,
        };
      } catch (error: any) {
        throw new Error(error.message || 'An error occurred during login');
      }
    },

    // Register mutation
    register: async (
      _: any,
      { input }: { input: { name: string; email: string; password: string } },
      ctx: GraphQLContext
    ) => {
      try {
        // Check if email already exists
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email: input.email },
        });

        if (existingUser) {
          throw new Error('Email already in use');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(input.password, 10);

        // Create user
        const user = await ctx.prisma.user.create({
          data: {
            name: input.name,
            email: input.email,
            password: hashedPassword,
            role: 'USER', // Default role
          },
        });

        // Generate JWT token
        const token = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET || 'default_secret',
          { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
        );

        // Generate refresh token
        const refreshToken = jwt.sign(
          { userId: user.id },
          process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
          { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as SignOptions
        );

        // Return user and tokens
        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          token,
          refreshToken,
        };
      } catch (error: any) {
        throw new Error(error.message || 'An error occurred during registration');
      }
    },

    // Refresh token mutation
    refreshToken: async (
      _: any,
      { refreshToken }: { refreshToken: string },
      ctx: GraphQLContext
    ) => {
      try {
        // Verify refresh token
        const decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET || 'default_refresh_secret'
        ) as { userId: string };

        // Find user
        const user = await ctx.prisma.user.findUnique({
          where: { id: decoded.userId },
        });

        if (!user) {
          throw new Error('Invalid refresh token');
        }

        // Generate new JWT token
        const token = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET || 'default_secret',
          { expiresIn: process.env.JWT_EXPIRES_IN || '1d' } as SignOptions
        );

        // Generate new refresh token
        const newRefreshToken = jwt.sign(
          { userId: user.id },
          process.env.JWT_REFRESH_SECRET || 'default_refresh_secret',
          { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as SignOptions
        );

        // Return new tokens
        return {
          token,
          refreshToken: newRefreshToken,
        };
      } catch (error) {
        throw new Error('Invalid refresh token');
      }
    },

    // Change password mutation
    changePassword: async (
      _: any,
      {
        currentPassword,
        newPassword
      }: {
        currentPassword: string;
        newPassword: string;
      },
      ctx: GraphQLContext
    ) => {
      try {
        // Check if user is authenticated
        if (!ctx.user?.id) {
          throw new Error('Not authenticated');
        }

        // Find user
        const user = await ctx.prisma.user.findUnique({
          where: { id: ctx.user.id },
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
          throw new Error('Current password is incorrect');
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await ctx.prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword },
        });

        return true;
      } catch (error: any) {
        throw new Error(error.message || 'An error occurred while changing password');
      }
    },
  },

  Query: {
    // Get current user
    me: async (_: any, __: any, ctx: GraphQLContext) => {
      try {
        // Check if user is authenticated
        if (!ctx.user?.id) {
          throw new Error('Not authenticated');
        }

        // Find user
        const user = await ctx.prisma.user.findUnique({
          where: { id: ctx.user.id },
        });

        if (!user) {
          throw new Error('User not found');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      } catch (error: any) {
        throw new Error(error.message || 'An error occurred while fetching user');
      }
    },
  },
};