import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';
import * as bcrypt from 'bcrypt';

// Initialize Prisma client
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Starting admin user creation...');
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (existingUser) {
      console.log('Admin user already exists. Skipping creation.');
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    
    // Generate IDs using nanoid
    const userId = nanoid();
    const themeSettingsId = nanoid();
    
    console.log('Creating admin user...');
    
    // 1. Create the user
    const user = await prisma.user.create({
      data: {
        id: userId,
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        isRenter: false,
        updatedAt: new Date(),
      }
    });
    
    console.log(`User created with ID: ${user.id}`);
    
    // 2. Create theme settings for the user
    await prisma.themeSettings.create({
      data: {
        id: themeSettingsId,
        userId: user.id,
        fontSize: 'medium',
        fontFamily: 'inter',
        colorScheme: 'default',
        darkMode: false,
        updatedAt: new Date(),
      }
    });
    
    console.log('Theme settings created');
    
    // 3. Find or create admin role
    let adminRole = await prisma.role.findFirst({
      where: { name: 'ADMIN' }
    });
    
    if (!adminRole) {
      adminRole = await prisma.role.create({
        data: {
          id: nanoid(),
          name: 'ADMIN',
          description: 'Administrator with full access',
          isDefault: false,
          updatedAt: new Date(),
        }
      });
      console.log('Admin role created');
    } else {
      console.log('Admin role already exists');
    }
    
    // 4. Assign admin role to the user
    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
        assignedAt: new Date(),
      }
    });
    
    console.log('Admin role assigned to user');
    
    console.log('Admin user setup complete!');
    console.log('Email: admin@example.com');
    console.log('Password: Admin@123');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  }); 