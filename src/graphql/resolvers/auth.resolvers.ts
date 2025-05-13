import { GraphQLContext } from '../context';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';
import { nanoid } from 'nanoid';

// Authentication resolvers
export const authResolvers = {
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
          include: {
            userRoles: {
              include: {
                role: true
              }
            }
          }
        });

        if (!user) {
          throw new Error('User not found');
        }

        // Get user roles
        const roles = user.userRoles.map(ur => ur.role.name);
        console.log(roles, "** roles **");
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: roles[0]
        };
      } catch (error: any) {
        throw new Error(error.message || 'An error occurred while fetching user');
      }
    },

    // Get all users (admin) or renters (user)
    users: async (_: any, __: any, ctx: GraphQLContext) => {
      try {
        // Check if user is authenticated
        if (!ctx.user?.id) {
          throw new Error('Not authenticated');
        }
        console.log(ctx.user.role, "** ctx.user.role **");


        // If user is admin, return all users
        if (ctx.user.role === 'ADMIN') {
          const users = await ctx.prisma.user.findMany({
            include: {
              userRoles: {
                include: {
                  role: true
                }
              }
            }
          });

          const renters = await ctx.prisma.renter.findMany();

          return {
            users: users.map(user => ({
              id: user.id,
              name: user.name,
              email: user.email,
              roles: user.userRoles.map(ur => ur.role.name),
              type: 'USER'
            })),
            renters: renters.map(renter => ({
              id: renter.id,
              name: renter.name,
              email: renter.email || null,
              phone: renter.phone,
              type: 'RENTER'
            }))
          };
        } else {
          // If user is not admin, return only renters associated with their properties
          const properties = await ctx.prisma.property.findMany({
            where: { userId: ctx.user.id }
          });

          const propertyIds = properties.map(property => property.id);

          const rooms = await ctx.prisma.room.findMany({
            where: { propertyId: { in: propertyIds } }
          });

          const roomIds = rooms.map(room => room.id);

          const renters = await ctx.prisma.renter.findMany({
            where: { roomId: { in: roomIds } }
          });

          return {
            users: [],
            renters: renters.map(renter => ({
              id: renter.id,
              name: renter.name,
              email: renter.email || null,
              phone: renter.phone,
              type: 'RENTER'
            }))
          };
        }
      } catch (error: any) {
        throw new Error(error.message || 'An error occurred while fetching users');
      }
    },
  },
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
          include: {
            userRoles: {
              include: {
                role: true
              }
            }
          }
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

        // Get the primary role (or default to 'USER')
        let userRole = 'USER';
        if (user.userRoles && user.userRoles.length > 0) {
          userRole = user.userRoles[0].role.name;
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

        // Set HTTP-only cookies
        if (ctx.req.res) {
          ctx.req.res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            sameSite: 'strict',
            path: '/'
          });

          ctx.req.res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'strict',
            path: '/'
          });
        }

        // Return user info (but not the tokens as they're now in cookies)
        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: userRole,
          },
          success: true
        };
      } catch (error: any) {
        throw new Error(error.message || 'An error occurred during login');
      }
    },

    // Register mutation
    register: async (
      _: any,
      { input }: { input: { name: string; email: string; password: string; isRenter?: boolean } },
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
            id: nanoid(),
            name: input.name,
            email: input.email,
            password: hashedPassword,
            isRenter: input.isRenter || false,
            updatedAt: new Date(),
          },
        });

        // Auto-create default theme settings for the user
        await ctx.prisma.themeSettings.create({
          data: {
            id: nanoid(),
            userId: user.id,
            fontSize: 'medium',
            fontFamily: 'inter',
            colorScheme: 'default',
            darkMode: false,
            updatedAt: new Date(),
          },
        });

        // Find appropriate role based on isRenter flag
        const roleToAssign = await ctx.prisma.role.findFirst({
          where: {
            name: input.isRenter ? 'RENTER' : 'USER'
          },
        });

        // If role not found, fallback to default role
        let roleName = roleToAssign?.name || 'USER';

        if (!roleToAssign) {
          // Find default role as fallback
          const defaultRole = await ctx.prisma.role.findFirst({
            where: { isDefault: true },
          });

          if (defaultRole) {
            // Assign default role
            await ctx.prisma.userRole.create({
              data: {
                userId: user.id,
                roleId: defaultRole.id,
              },
            });
            roleName = defaultRole.name;
          }
        } else {
          // Assign the selected role
          await ctx.prisma.userRole.create({
            data: {
              userId: user.id,
              roleId: roleToAssign.id,
            },
          });
        }

        // If user is registering as renter, create a renter entry
        if (input.isRenter) {
          // Create renter record linked to the user
          const renter = await ctx.prisma.renter.create({
            data: {
              id: nanoid(),
              name: user.name,
              email: user.email,
              phone: "",
              user: {
                connect: { id: user.id }
              },
              updatedAt: new Date(),
            },
          });

          // Update the user to link back to renter
          await ctx.prisma.user.update({
            where: { id: user.id },
            data: { renterId: renter.id },
          });
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

        // Set HTTP-only cookies
        if (ctx.req.res) {
          ctx.req.res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 1 day
            sameSite: 'strict',
            path: '/'
          });

          ctx.req.res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: 'strict',
            path: '/'
          });
        }

        // Return user info (but not the tokens as they're now in cookies)
        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: roleName,
          },
          success: true
        };
      } catch (error: any) {
        throw new Error(error.message || 'An error occurred during registration');
      }
    },

    // Logout mutation
    logout: async (_: any, __: any, ctx: GraphQLContext) => {
      if (ctx.req.res) {
        // Clear the cookies
        ctx.req.res.clearCookie('token', { path: '/' });
        ctx.req.res.clearCookie('refreshToken', { path: '/' });
      }

      return { success: true };
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
};