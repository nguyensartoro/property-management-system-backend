#!/usr/bin/env node

/**
 * Model Migration Script
 * 
 * This script helps with data migration when Prisma schema changes.
 * It handles:
 * 1. Setting up default roles and permissions
 * 2. Migrating existing users to the new role system
 * 3. Creating role-based permissions
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDefaultRoles() {
  console.log('🔄 Creating default roles...');
  
  try {
    // Create admin role
    const adminRole = await prisma.role.upsert({
      where: { name: 'ADMIN' },
      update: {},
      create: {
        name: 'ADMIN',
        description: 'Administrator with full system access',
        isDefault: false
      }
    });
    
    // Create user role
    const userRole = await prisma.role.upsert({
      where: { name: 'USER' },
      update: {},
      create: {
        name: 'USER',
        description: 'Regular user with limited access',
        isDefault: true
      }
    });
    
    // Create property manager role
    const managerRole = await prisma.role.upsert({
      where: { name: 'PROPERTY_MANAGER' },
      update: {},
      create: {
        name: 'PROPERTY_MANAGER',
        description: 'Property manager with access to manage properties',
        isDefault: false
      }
    });
    
    // Create renter role
    const renterRole = await prisma.role.upsert({
      where: { name: 'RENTER' },
      update: {},
      create: {
        name: 'RENTER',
        description: 'Renter with access to view their own information',
        isDefault: false
      }
    });
    
    console.log('✅ Default roles created successfully');
    return { adminRole, userRole, managerRole, renterRole };
    
  } catch (error) {
    console.error('❌ Error creating default roles:', error);
    throw error;
  }
}

async function createDefaultPermissions(roles) {
  console.log('🔄 Creating default permissions...');
  
  const { adminRole, userRole, managerRole, renterRole } = roles;
  
  try {
    // List of resources in the system
    const resources = ['property', 'room', 'renter', 'contract', 'service', 'payment', 'expense', 'user'];
    
    // Actions for resources
    const actions = ['create', 'read', 'update', 'delete', 'list'];
    
    // Create permissions for each resource+action combination
    for (const resource of resources) {
      for (const action of actions) {
        const permissionName = `${resource}:${action}`;
        
        const permission = await prisma.permission.upsert({
          where: { name: permissionName },
          update: {},
          create: {
            name: permissionName,
            description: `Can ${action} ${resource}`,
            resource,
            action
          }
        });
        
        // Assign to admin role - admins get everything
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        });
        
        // Assign specific permissions to manager role
        if (action === 'read' || action === 'list' || 
            (resource !== 'expense' && resource !== 'user' && action !== 'delete')) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: managerRole.id,
                permissionId: permission.id
              }
            },
            update: {},
            create: {
              roleId: managerRole.id,
              permissionId: permission.id
            }
          });
        }
        
        // Assign limited permissions to user role
        if ((action === 'read' || action === 'list') && 
            ['property', 'room', 'contract', 'service'].includes(resource)) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: userRole.id,
                permissionId: permission.id
              }
            },
            update: {},
            create: {
              roleId: userRole.id,
              permissionId: permission.id
            }
          });
        }
        
        // Assign very limited permissions to renter role
        if ((action === 'read' || action === 'list') && 
            (resource === 'contract' || 
             (resource === 'room' && action === 'read') ||
             (resource === 'payment' && action === 'read') ||
             (resource === 'renter' && action === 'read'))) {
          await prisma.rolePermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: renterRole.id,
                permissionId: permission.id
              }
            },
            update: {},
            create: {
              roleId: renterRole.id,
              permissionId: permission.id
            }
          });
        }
      }
    }
    
    console.log('✅ Default permissions created successfully');
    
  } catch (error) {
    console.error('❌ Error creating default permissions:', error);
    throw error;
  }
}

async function migrateExistingUsers(roles) {
  console.log('🔄 Migrating existing users to the new role system...');
  
  try {
    const { adminRole, userRole } = roles;
    
    // Get all users
    const users = await prisma.user.findMany();
    
    for (const user of users) {
      // Get existing roles
      const existingRoles = await prisma.userRole.findMany({
        where: { userId: user.id }
      });
      
      // If user has no roles, assign appropriate default role
      if (existingRoles.length === 0) {
        // Try to detect if user might be an admin
        const isAdmin = await prisma.property.count({
          where: { userId: user.id }
        }) > 0;
        
        const roleId = isAdmin ? adminRole.id : userRole.id;
        
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId
          }
        });
      }
    }
    
    console.log(`✅ Migrated ${users.length} users to the new role system`);
    
  } catch (error) {
    console.error('❌ Error migrating users:', error);
    throw error;
  }
}

async function migrateContracts() {
  console.log('🔄 Migrating contracts to use contractType enum...');
  
  try {
    // Check if any contracts need migration
    const contractsCount = await prisma.contract.count();
    
    if (contractsCount > 0) {
      console.log(`Found ${contractsCount} contracts to process`);
      
      // Ensure all contracts have the contractType field set properly
      const updated = await prisma.$executeRaw`
        UPDATE "Contract" 
        SET "contractType" = 'LONG_TERM'
        WHERE "contractType" IS NULL
      `;
      
      console.log(`✅ Updated ${updated} contracts with default contractType`);
    } else {
      console.log('No contracts found to migrate');
    }
    
    console.log('✅ Contract migration completed successfully');
    
  } catch (error) {
    console.error('❌ Error migrating contracts:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting model migration script...');
  
  try {
    // Run migrations in sequence
    await migrateContracts();
    const roles = await createDefaultRoles();
    await createDefaultPermissions(roles);
    await migrateExistingUsers(roles);
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 