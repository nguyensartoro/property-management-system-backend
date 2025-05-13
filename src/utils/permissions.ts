import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Define types to avoid implicit any
interface Permission {
  resource: string;
  action: string;
  name: string;
}

interface RolePermission {
  permission: Permission;
}

interface Role {
  name: string;
  rolePermissions: RolePermission[];
}

interface UserRole {
  role: Role;
}

interface User {
  id: string;
  userRoles: UserRole[];
  isRenter?: boolean;
  renterId?: string;
}

/**
 * Check if a user has a specific permission for a resource and action
 * @param user - The user object from the request
 * @param resource - The resource being accessed (e.g., 'user', 'property')
 * @param action - The action being performed (e.g., 'read', 'create', 'update', 'delete', 'list')
 * @returns Boolean indicating if the user has permission
 */
export const hasPermission = (user: User, resource: string, action: string): boolean => {
  // Admin users have all permissions
  if (user.userRoles?.some((ur) => ur.role.name === 'ADMIN')) {
    return true;
  }

  // Check if user has the specific permission through any of their roles
  const hasSpecificPermission = user.userRoles?.some((userRole) => 
    userRole.role.rolePermissions?.some((rp) => 
      rp.permission.resource === resource && 
      rp.permission.action === action
    )
  );

  if (hasSpecificPermission) {
    return true;
  }

  // Special case for renters accessing their own data
  if (user.isRenter && resource === 'renter' && action === 'read') {
    return true;
  }

  return false;
};

/**
 * Check if user has access to a specific renter
 * @param user - The user object from the request
 * @param renterId - The ID of the renter being accessed
 * @returns Promise resolving to a boolean indicating if the user has access
 */
export const hasRenterAccess = async (user: User, renterId: string): Promise<boolean> => {
  // Admin users have access to all renters
  if (user.userRoles?.some((ur) => ur.role.name === 'ADMIN')) {
    return true;
  }

  // Renters can only access their own data
  if (user.isRenter) {
    return user.renterId === renterId;
  }

  // Property managers can access renters in their properties
  if (user.userRoles?.some((ur) => ur.role.name === 'PROPERTY_MANAGER')) {
    const renter = await prisma.renter.findUnique({
      where: { id: renterId },
      include: {
        room: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!renter) {
      return false;
    }

    // Check if renter belongs to a property owned by the user
    return Boolean(
      renter.room?.property && renter.room.property.userId === user.id
    );
  }

  return false;
};

/**
 * Get all permissions for a user
 * @param userId - The ID of the user
 * @returns Promise resolving to an array of permission objects
 */
export const getUserPermissions = async (userId: string): Promise<Permission[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userRoles: {
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return [];
  }

  // Extract unique permissions from all roles
  const permissions = user.userRoles.flatMap((userRole) => 
    userRole.role.rolePermissions.map((rolePermission) => ({
      resource: rolePermission.permission.resource,
      action: rolePermission.permission.action,
      name: rolePermission.permission.name,
    }))
  );

  // Remove duplicates
  return [...new Map(permissions.map((p: Permission) => [p.name, p])).values()];
}; 