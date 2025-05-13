import { GraphQLContext } from '../context';

// Custom error class for authorization errors
class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'list';
}

// Define permission rule types
export type PermissionRule = (
  context: GraphQLContext,
  params: any
) => boolean | Promise<boolean>;

/**
 * Higher-order function to check if the user has the required permission
 * @param resource The resource being accessed (e.g., 'renter', 'room', 'property')
 * @param action The action being performed (e.g., 'create', 'read', 'update', 'delete', 'list')
 * @returns A function that checks if the user has the required permission
 */
export const hasPermission = (resource: string, action: Permission['action']): PermissionRule => {
  return async (context: GraphQLContext, _params: any): Promise<boolean> => {
    const { user, prisma } = context;

    if (!user) {
      throw new AuthorizationError('Authentication required');
    }

    // Admin users have all permissions
    if (user.role === 'ADMIN') {
      return true;
    }

    // Find a role with the required permission
    const role = await prisma.role.findFirst({
      where: {
        name: user.role,
        rolePermissions: {
          some: {
            permission: {
              resource,
              action
            }
          }
        }
      }
    });

    return !!role;
  };
};

/**
 * Check if the user is the owner of a resource
 * @param resource The resource being accessed
 * @param idField The name of the ID field in the params
 * @returns A function that checks if the user is the owner of the resource
 */
export const isOwner = (resource: string, idField: string): PermissionRule => {
  return async (context: GraphQLContext, params: any): Promise<boolean> => {
    const { user, prisma } = context;

    if (!user) {
      throw new AuthorizationError('Authentication required');
    }

    // Admin users are considered owners of all resources
    if (user.role === 'ADMIN') {
      return true;
    }

    const resourceId = params[idField];
    if (!resourceId) {
      return false;
    }

    // Dynamic lookup based on resource type
    switch (resource) {
      case 'property':
        const property = await prisma.property.findUnique({
          where: { id: resourceId },
          select: { userId: true }
        });
        return property?.userId === user.id;

      case 'room':
        const room = await prisma.room.findUnique({
          where: { id: resourceId },
          select: { property: { select: { userId: true } } }
        });
        return room?.property?.userId === user.id;

      case 'renter':
        const renter = await prisma.renter.findUnique({
          where: { id: resourceId },
          include: { user: true }
        });
        return renter?.user?.id === user.id;

      case 'document':
        const document = await prisma.document.findUnique({
          where: { id: resourceId },
          include: { renter: { include: { user: true } } }
        });
        return document?.renter?.user?.id === user.id;

      case 'contract':
        const contract = await prisma.contract.findUnique({
          where: { id: resourceId },
          select: {
            room: { select: { property: { select: { userId: true } } } }
          }
        });
        return contract?.room?.property?.userId === user.id;

      default:
        return false;
    }
  };
};

/**
 * Check if the user can access a specific renter
 * @param renterIdField The name of the renter ID field in the params
 * @returns A function that checks if the user can access the renter
 */
export const canAccessRenter = (renterIdField: string): PermissionRule => {
  return async (context: GraphQLContext, params: any): Promise<boolean> => {
    const { user, prisma } = context;

    if (!user) {
      throw new AuthorizationError('Authentication required');
    }

    // Admin users can access all renters
    if (user.role === 'ADMIN') {
      return true;
    }

    const renterId = params[renterIdField];
    if (!renterId) {
      return false;
    }

    // Property managers can access renters in their properties
    if (user.role === 'PROPERTY_MANAGER') {
      const renter = await prisma.renter.findUnique({
        where: { id: renterId },
        select: {
          contracts: {
            select: {
              room: {
                select: {
                  property: {
                    select: { userId: true }
                  }
                }
              }
            }
          }
        }
      });

      // Check if any of the renter's contracts are for rooms in properties owned by the user
      return renter?.contracts.some(
        contract => contract.room?.property?.userId === user.id
      ) || false;
    }

    // Regular users can only access themselves if they are renters
    if (user.role === 'USER') {
      const renter = await prisma.renter.findUnique({
        where: { id: renterId },
        include: { user: true }
      });
      return renter?.user?.id === user.id;
    }

    return false;
  };
};

/**
 * Combine multiple permission rules with AND logic
 * @param rules The permission rules to combine
 * @returns A function that checks if all rules pass
 */
export const and = (...rules: PermissionRule[]): PermissionRule => {
  return async (context: GraphQLContext, params: any): Promise<boolean> => {
    for (const rule of rules) {
      if (!(await rule(context, params))) {
        return false;
      }
    }
    return true;
  };
};

/**
 * Combine multiple permission rules with OR logic
 * @param rules The permission rules to combine
 * @returns A function that checks if any rule passes
 */
export const or = (...rules: PermissionRule[]): PermissionRule => {
  return async (context: GraphQLContext, params: any): Promise<boolean> => {
    for (const rule of rules) {
      if (await rule(context, params)) {
        return true;
      }
    }
    return false;
  };
};

/**
 * Apply a permission rule to a resolver
 * @param rule The permission rule to apply
 * @param resolver The resolver function
 * @returns A new resolver function that checks the permission rule before executing the original resolver
 */
export const applyPermission = (rule: PermissionRule, resolver: Function) => {
  return async (parent: any, args: any, context: GraphQLContext, info: any) => {
    const allowed = await rule(context, args);

    if (!allowed) {
      throw new AuthorizationError('Not authorized');
    }

    return resolver(parent, args, context, info);
  };
};