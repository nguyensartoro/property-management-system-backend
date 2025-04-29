import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  try {
    // Create an admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    console.log(`Created admin user with ID: ${admin.id}`);

    // Create a regular user
    const userPassword = await bcrypt.hash('User@123', 12);
    const user = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
        name: 'Regular User',
        password: userPassword,
        role: 'USER',
      },
    });
    console.log(`Created regular user with ID: ${user.id}`);

    // Create subscription plans
    const basicPlan = await prisma.subscriptionPlan.upsert({
      where: { id: 'plan-basic' },
      update: {},
      create: {
        id: 'plan-basic',
        name: 'Basic',
        description: 'For property owners with up to 10 rooms',
        price: 10,
        roomLimit: 10,
        billingCycle: 'MONTHLY',
        features: ['Room Management', 'Renter Management', 'Basic Reporting'],
      },
    });

    const standardPlan = await prisma.subscriptionPlan.upsert({
      where: { id: 'plan-standard' },
      update: {},
      create: {
        id: 'plan-standard',
        name: 'Standard',
        description: 'For property owners with 11-50 rooms',
        price: 20,
        roomLimit: 50,
        billingCycle: 'MONTHLY',
        features: [
          'Room Management',
          'Renter Management',
          'Advanced Reporting',
          'Contract Management',
          'Payment Tracking',
        ],
      },
    });

    const premiumPlan = await prisma.subscriptionPlan.upsert({
      where: { id: 'plan-premium' },
      update: {},
      create: {
        id: 'plan-premium',
        name: 'Premium',
        description: 'For property owners with 51-100 rooms',
        price: 40,
        roomLimit: 100,
        billingCycle: 'MONTHLY',
        features: [
          'Room Management',
          'Renter Management',
          'Advanced Reporting',
          'Contract Management',
          'Payment Tracking',
          'Service Management',
          'Maintenance Tracking',
          'Email Notifications',
        ],
      },
    });

    const enterprisePlan = await prisma.subscriptionPlan.upsert({
      where: { id: 'plan-enterprise' },
      update: {},
      create: {
        id: 'plan-enterprise',
        name: 'Enterprise',
        description: 'For property owners with over 100 rooms',
        price: 80,
        roomLimit: 999999, // Effectively unlimited
        billingCycle: 'MONTHLY',
        features: [
          'Room Management',
          'Renter Management',
          'Advanced Reporting',
          'Contract Management',
          'Payment Tracking',
          'Service Management',
          'Maintenance Tracking',
          'Email Notifications',
          'API Access',
          'Premium Support',
          'Custom Integrations',
          'Multiple Property Management',
        ],
      },
    });

    console.log('Created subscription plans');

    // Create user subscription
    const subscription = await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        planId: standardPlan.id,
        status: 'ACTIVE',
        autoRenew: true,
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      },
    });
    console.log(`Created subscription for user with ID: ${user.id}`);

    // Create user preferences
    const userPrefs = await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        darkMode: false,
        fontSize: 'medium',
        colorTheme: 'default',
      },
    });
    console.log(`Created user preferences for user with ID: ${user.id}`);

    // Create a property
    const property = await prisma.property.create({
      data: {
        name: 'Sunset Apartments',
        address: '123 Sunset Blvd, Los Angeles, CA 90001',
        userId: user.id,
      },
    });
    console.log(`Created property with ID: ${property.id}`);

    // Create rooms
    const roomStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'];
    
    for (let i = 1; i <= 10; i++) {
      const floor = Math.ceil(i / 4);
      const status = roomStatuses[Math.floor(Math.random() * roomStatuses.length)];
      
      const room = await prisma.room.create({
        data: {
          name: `Room ${100 + i}`,
          number: `${floor}${i % 4 === 0 ? 4 : i % 4}`,
          floor,
          size: 20 + Math.floor(Math.random() * 15),
          description: `Standard ${i % 2 === 0 ? 'single' : 'double'} room with ${i % 3 === 0 ? 'city' : 'garden'} view.`,
          status: status as any,
          price: 500 + (i * 50),
          images: [
            `https://example.com/rooms/room${i}_1.jpg`,
            `https://example.com/rooms/room${i}_2.jpg`,
          ],
          propertyId: property.id,
        },
      });
      console.log(`Created room with ID: ${room.id}`);
    }

    // Create renters
    const renter1 = await prisma.renter.create({
      data: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '555-123-4567',
        emergencyContact: '555-987-6543',
        identityNumber: 'ID12345678',
        roomId: null, // Will assign later
      },
    });

    const renter2 = await prisma.renter.create({
      data: {
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '555-234-5678',
        emergencyContact: '555-876-5432',
        identityNumber: 'ID87654321',
        roomId: null, // Will assign later
      },
    });

    console.log(`Created renters`);

    // Get occupied rooms
    const occupiedRooms = await prisma.room.findMany({
      where: {
        status: 'OCCUPIED',
      },
      take: 2,
    });

    if (occupiedRooms.length > 0) {
      // Assign renter1 to first occupied room
      await prisma.renter.update({
        where: { id: renter1.id },
        data: {
          roomId: occupiedRooms[0].id,
        },
      });

      // Create contract for renter1
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const contract1 = await prisma.contract.create({
        data: {
          name: 'One Year Lease',
          renterId: renter1.id,
          roomId: occupiedRooms[0].id,
          startDate,
          endDate,
          amount: occupiedRooms[0].price,
          securityDeposit: occupiedRooms[0].price * 2,
          isLongTerm: true,
          status: 'ACTIVE',
          document: 'https://example.com/contracts/contract1.pdf',
        },
      });

      console.log(`Created contract for renter1`);

      // Create payments for renter1
      const currentDate = new Date();
      
      for (let i = 0; i < 6; i++) {
        const dueDate = new Date(currentDate);
        dueDate.setMonth(currentDate.getMonth() + i);
        
        const paidDate = i < 2 ? new Date(dueDate) : null; // First 2 months paid
        paidDate?.setDate(dueDate.getDate() - 2); // Paid 2 days before due date
        
        await prisma.payment.create({
          data: {
            amount: occupiedRooms[0].price,
            status: i < 2 ? 'PAID' : 'PENDING',
            type: 'RENT',
            dueDate,
            paidDate,
            description: `Monthly rent for ${dueDate.toLocaleString('default', { month: 'long' })} ${dueDate.getFullYear()}`,
            renterId: renter1.id,
            contractId: contract1.id,
          },
        });
      }
      
      console.log(`Created payments for renter1`);

      if (occupiedRooms.length > 1) {
        // Assign renter2 to second occupied room
        await prisma.renter.update({
          where: { id: renter2.id },
          data: {
            roomId: occupiedRooms[1].id,
          },
        });

        // Create contract for renter2
        const startDate2 = new Date();
        startDate2.setMonth(startDate2.getMonth() - 2); // Started 2 months ago
        const endDate2 = new Date(startDate2);
        endDate2.setMonth(endDate2.getMonth() + 6); // 6 month lease

        const contract2 = await prisma.contract.create({
          data: {
            name: 'Six Month Lease',
            renterId: renter2.id,
            roomId: occupiedRooms[1].id,
            startDate: startDate2,
            endDate: endDate2,
            amount: occupiedRooms[1].price,
            securityDeposit: occupiedRooms[1].price * 1.5,
            isLongTerm: true,
            status: 'ACTIVE',
            document: 'https://example.com/contracts/contract2.pdf',
          },
        });

        console.log(`Created contract for renter2`);

        // Create payments for renter2
        for (let i = 0; i < 6; i++) {
          const dueDate = new Date(startDate2);
          dueDate.setMonth(startDate2.getMonth() + i);
          
          const paidDate = i < 3 ? new Date(dueDate) : null; // First 3 months paid
          if (paidDate) {
            if (i === 2) {
              // Late payment for 3rd month
              paidDate.setDate(dueDate.getDate() + 3);
            } else {
              // On-time payments for 1st and 2nd month
              paidDate.setDate(dueDate.getDate() - 1);
            }
          }
          
          await prisma.payment.create({
            data: {
              amount: occupiedRooms[1].price,
              status: i < 3 ? 'PAID' : 'PENDING',
              type: 'RENT',
              dueDate,
              paidDate,
              description: `Monthly rent for ${dueDate.toLocaleString('default', { month: 'long' })} ${dueDate.getFullYear()}`,
              renterId: renter2.id,
              contractId: contract2.id,
            },
          });
        }
        
        console.log(`Created payments for renter2`);
      }
    }

    // Create documents for renters
    await prisma.document.create({
      data: {
        name: 'ID Card',
        type: 'ID_CARD',
        path: 'https://example.com/documents/id_card_1.pdf',
        renterId: renter1.id,
      },
    });

    await prisma.document.create({
      data: {
        name: 'Passport',
        type: 'PASSPORT',
        path: 'https://example.com/documents/passport_2.pdf',
        renterId: renter2.id,
      },
    });

    console.log('Created documents for renters');

    // Create services
    const services = [
      {
        name: 'Internet',
        description: 'High-speed fiber internet',
        fee: 30,
        feeType: 'MONTHLY',
        icon: 'wifi',
      },
      {
        name: 'Cleaning',
        description: 'Weekly cleaning service',
        fee: 50,
        feeType: 'MONTHLY',
        icon: 'cleaning',
      },
      {
        name: 'Laundry',
        description: 'Laundry service',
        fee: 25,
        feeType: 'MONTHLY',
        icon: 'laundry',
      },
      {
        name: 'Parking',
        description: 'Parking space',
        fee: 40,
        feeType: 'MONTHLY',
        icon: 'car',
      },
      {
        name: 'Key Replacement',
        description: 'Replacement for lost keys',
        fee: 20,
        feeType: 'ONE_TIME',
        icon: 'key',
      },
    ];

    for (const serviceData of services) {
      await prisma.service.create({
        data: serviceData as any,
      });
    }

    console.log('Created services');

    // Add services to rooms
    const allServices = await prisma.service.findMany();
    const allRooms = await prisma.room.findMany({
      where: {
        status: 'OCCUPIED',
      },
    });

    if (allRooms.length > 0 && allServices.length > 0) {
      // Add internet to first room
      const internetService = allServices.find(s => s.name === 'Internet');
      if (internetService && allRooms[0]) {
        const roomService = await prisma.roomService.create({
          data: {
            roomId: allRooms[0].id,
            serviceId: internetService.id,
            status: 'ACTIVE',
          },
        });

        console.log(`Added internet service to room ${allRooms[0].name}`);

        // Create payment for service
        await prisma.payment.create({
          data: {
            amount: internetService.fee,
            status: 'PENDING',
            type: 'SERVICE',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
            description: `Internet service for ${allRooms[0].name}`,
            renterId: renter1.id,
            roomServiceId: roomService.id,
          },
        });
      }

      // Add cleaning to first room
      const cleaningService = allServices.find(s => s.name === 'Cleaning');
      if (cleaningService && allRooms[0]) {
        await prisma.roomService.create({
          data: {
            roomId: allRooms[0].id,
            serviceId: cleaningService.id,
            status: 'ACTIVE',
          },
        });

        console.log(`Added cleaning service to room ${allRooms[0].name}`);
      }
    }

    // Create maintenance events
    const maintenanceEvents = [
      {
        title: 'Fix leaking faucet',
        description: 'The bathroom faucet has a slow leak that needs repair',
        status: 'PENDING',
        priority: 'MEDIUM',
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      },
      {
        title: 'Replace AC filter',
        description: 'Regular maintenance - replace air conditioner filter',
        status: 'PENDING',
        priority: 'LOW',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
      {
        title: 'Fix broken window',
        description: 'Window in bedroom does not close properly',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        scheduledDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
      },
    ];

    if (allRooms.length > 0) {
      for (let i = 0; i < Math.min(maintenanceEvents.length, allRooms.length); i++) {
        await prisma.maintenanceEvent.create({
          data: {
            ...maintenanceEvents[i] as any,
            roomId: allRooms[i].id,
          },
        });

        // If this is a maintenance event, update room status to MAINTENANCE
        if (maintenanceEvents[i].priority === 'HIGH') {
          await prisma.room.update({
            where: { id: allRooms[i].id },
            data: { status: 'MAINTENANCE' },
          });
        }
      }
    }

    console.log('Created maintenance events');

    // Create expenses
    const expenses = [
      {
        name: 'Property Insurance',
        amount: 1200,
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        category: 'INSURANCE',
        description: 'Annual property insurance premium',
      },
      {
        name: 'Plumbing Repairs',
        amount: 350,
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        category: 'MAINTENANCE',
        description: 'Emergency plumbing repairs',
      },
      {
        name: 'Landscaping',
        amount: 200,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        category: 'MAINTENANCE',
        description: 'Monthly landscaping service',
      },
      {
        name: 'Property Tax',
        amount: 2500,
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        category: 'TAXES',
        description: 'Quarterly property tax payment',
      },
      {
        name: 'Utilities',
        amount: 450,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        category: 'UTILITIES',
        description: 'Monthly utilities for common areas',
      },
    ];

    for (const expenseData of expenses) {
      await prisma.expense.create({
        data: expenseData as any,
      });
    }

    console.log('Created expenses');

    console.log('Seeding completed successfully');
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  }); 