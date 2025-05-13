import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Define the roles
const roles = [
  {
    id: uuidv4(),
    name: 'ADMIN',
    description: 'Administrator with full system access',
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    name: 'USER',
    description: 'Standard property manager user',
    isDefault: true, // default role for new users
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: uuidv4(),
    name: 'RENTER',
    description: 'Tenant with limited access',
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Define permissions
const permissions = [
  // Property permissions
  { resource: 'Property', action: 'CREATE', description: 'Create a property' },
  { resource: 'Property', action: 'READ', description: 'View properties' },
  { resource: 'Property', action: 'UPDATE', description: 'Update property details' },
  { resource: 'Property', action: 'DELETE', description: 'Delete properties' },
  
  // Room permissions
  { resource: 'Room', action: 'CREATE', description: 'Create a room' },
  { resource: 'Room', action: 'READ', description: 'View rooms' },
  { resource: 'Room', action: 'UPDATE', description: 'Update room details' },
  { resource: 'Room', action: 'DELETE', description: 'Delete rooms' },
  
  // Renter permissions
  { resource: 'Renter', action: 'CREATE', description: 'Create a renter' },
  { resource: 'Renter', action: 'READ', description: 'View renters' },
  { resource: 'Renter', action: 'UPDATE', description: 'Update renter details' },
  { resource: 'Renter', action: 'DELETE', description: 'Delete renters' },
  
  // Contract permissions
  { resource: 'Contract', action: 'CREATE', description: 'Create a contract' },
  { resource: 'Contract', action: 'READ', description: 'View contracts' },
  { resource: 'Contract', action: 'UPDATE', description: 'Update contract details' },
  { resource: 'Contract', action: 'DELETE', description: 'Delete contracts' },
  
  // Payment permissions
  { resource: 'Payment', action: 'CREATE', description: 'Create payments' },
  { resource: 'Payment', action: 'READ', description: 'View payments' },
  { resource: 'Payment', action: 'UPDATE', description: 'Update payment details' },
  { resource: 'Payment', action: 'DELETE', description: 'Delete payments' },
  
  // Service permissions
  { resource: 'Service', action: 'CREATE', description: 'Create services' },
  { resource: 'Service', action: 'READ', description: 'View services' },
  { resource: 'Service', action: 'UPDATE', description: 'Update service details' },
  { resource: 'Service', action: 'DELETE', description: 'Delete services' },
  
  // Maintenance permissions
  { resource: 'Maintenance', action: 'CREATE', description: 'Create maintenance events' },
  { resource: 'Maintenance', action: 'READ', description: 'View maintenance events' },
  { resource: 'Maintenance', action: 'UPDATE', description: 'Update maintenance events' },
  { resource: 'Maintenance', action: 'DELETE', description: 'Delete maintenance events' },
  
  // User permissions
  { resource: 'User', action: 'CREATE', description: 'Create users' },
  { resource: 'User', action: 'READ', description: 'View users' },
  { resource: 'User', action: 'UPDATE', description: 'Update user details' },
  { resource: 'User', action: 'DELETE', description: 'Delete users' },
  
  // Specific admin permissions
  { resource: 'System', action: 'MANAGE_ROLES', description: 'Manage system roles' },
  { resource: 'System', action: 'MANAGE_PERMISSIONS', description: 'Manage permissions' },
  { resource: 'System', action: 'VIEW_LOGS', description: 'View system logs' },
  { resource: 'Subscription', action: 'MANAGE', description: 'Manage subscription plans' },
  
  // Document permissions
  { resource: 'Document', action: 'CREATE', description: 'Create documents' },
  { resource: 'Document', action: 'READ', description: 'View documents' },
  { resource: 'Document', action: 'UPDATE', description: 'Update documents' },
  { resource: 'Document', action: 'DELETE', description: 'Delete documents' },
];

// Role permission assignments
const rolePermissions = {
  ADMIN: permissions.map(p => `${p.resource}:${p.action}`), // All permissions
  USER: [
    // Property permissions for USER
    'Property:CREATE', 'Property:READ', 'Property:UPDATE', 'Property:DELETE',
    
    // Room permissions for USER
    'Room:CREATE', 'Room:READ', 'Room:UPDATE', 'Room:DELETE',
    
    // Renter permissions for USER
    'Renter:CREATE', 'Renter:READ', 'Renter:UPDATE', 'Renter:DELETE',
    
    // Contract permissions for USER
    'Contract:CREATE', 'Contract:READ', 'Contract:UPDATE', 'Contract:DELETE',
    
    // Payment permissions for USER
    'Payment:CREATE', 'Payment:READ', 'Payment:UPDATE', 'Payment:DELETE',
    
    // Service permissions for USER
    'Service:CREATE', 'Service:READ', 'Service:UPDATE', 'Service:DELETE',
    
    // Maintenance permissions for USER
    'Maintenance:CREATE', 'Maintenance:READ', 'Maintenance:UPDATE', 'Maintenance:DELETE',
    
    // Document permissions for USER
    'Document:CREATE', 'Document:READ', 'Document:UPDATE', 'Document:DELETE',
    
    // Limited user permissions for USER
    'User:READ'
  ],
  RENTER: [
    // Read-only permissions for renters on their own data
    'Renter:READ',
    'Room:READ',
    'Contract:READ',
    'Payment:READ',
    'Service:READ',
    'Maintenance:READ',
    'Document:READ',
    'User:READ'
  ]
};

// Admin user credentials
const adminUser = {
  id: uuidv4(),
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'Admin@123', // This will be hashed
  isRenter: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function main() {
  try {
    console.log('Starting role, permission, and admin user setup...');

    // Create roles
    for (const role of roles) {
      // Check if role already exists
      const existingRole = await prisma.role.findUnique({
        where: { name: role.name },
      });

      if (!existingRole) {
        await prisma.role.create({
          data: role,
        });
        console.log(`Created role: ${role.name}`);
      } else {
        console.log(`Role ${role.name} already exists`);
      }
    }

    // Create permissions
    for (const permission of permissions) {
      const permissionName = `${permission.resource}:${permission.action}`;
      
      // Check if permission already exists
      const existingPermission = await prisma.permission.findUnique({
        where: { name: permissionName },
      });

      if (!existingPermission) {
        await prisma.permission.create({
          data: {
            id: uuidv4(),
            name: permissionName,
            description: permission.description,
            resource: permission.resource,
            action: permission.action,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        console.log(`Created permission: ${permissionName}`);
      } else {
        console.log(`Permission ${permissionName} already exists`);
      }
    }

    // Assign permissions to roles
    for (const [roleName, permissionNames] of Object.entries(rolePermissions)) {
      const role = await prisma.role.findUnique({
        where: { name: roleName },
      });

      if (role) {
        for (const permissionName of permissionNames) {
          const permission = await prisma.permission.findUnique({
            where: { name: permissionName },
          });

          if (permission) {
            // Check if role-permission already exists
            const existingRolePermission = await prisma.rolePermission.findUnique({
              where: {
                roleId_permissionId: {
                  roleId: role.id,
                  permissionId: permission.id,
                },
              },
            });

            if (!existingRolePermission) {
              await prisma.rolePermission.create({
                data: {
                  roleId: role.id,
                  permissionId: permission.id,
                  assignedAt: new Date(),
                },
              });
              console.log(`Assigned permission ${permissionName} to role ${roleName}`);
            } else {
              console.log(`Role-permission ${roleName}:${permissionName} already exists`);
            }
          }
        }
      }
    }

    // Create admin user if it doesn't exist
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminUser.email },
    });

    if (!existingAdmin) {
      // Hash the password
      const hashedPassword = await bcrypt.hash(adminUser.password, 10);
      
      // Create the admin user
      const createdAdmin = await prisma.user.create({
        data: {
          ...adminUser,
          password: hashedPassword,
        },
      });

      console.log(`Created admin user: ${createdAdmin.email}`);

      // Assign admin role to the admin user
      const adminRole = await prisma.role.findUnique({
        where: { name: 'ADMIN' },
      });

      if (adminRole) {
        await prisma.userRole.create({
          data: {
            userId: createdAdmin.id,
            roleId: adminRole.id,
            assignedAt: new Date(),
          },
        });
        console.log(`Assigned ADMIN role to user ${createdAdmin.email}`);
      }

      // Create theme settings for admin
      await prisma.themeSettings.create({
        data: {
          id: uuidv4(),
          userId: createdAdmin.id,
          fontSize: 'medium',
          fontFamily: 'inter',
          colorScheme: 'default',
          darkMode: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log(`Created theme settings for admin user`);
    } else {
      console.log(`Admin user already exists`);
    }

    console.log('Setup completed successfully!');
  } catch (error) {
    console.error('Error during setup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 