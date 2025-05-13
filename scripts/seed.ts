import { PrismaClient, RoomStatus, FeeType, User, Property, Room, Renter, Service, DocumentType, ContractType, BillingCycle } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Configuration for how many records to create
const NUM_PROPERTIES_PER_USER = 3; // Each property manager will have 1-3 properties
const NUM_ROOMS_PER_PROPERTY = 15; // Each property will have 5-15 rooms
const NUM_RENTERS = 50;
const NUM_SERVICES = 14;
const NUM_EXPENSES = 50;
const NUM_MAINTENANCE_EVENTS = 25;

async function main() {
  console.log('Starting enhanced seeding...');

  try {
    // Get or create roles first
    const adminRole = await prisma.role.findFirst({
      where: { name: 'ADMIN' }
    });

    const userRole = await prisma.role.findFirst({
      where: { name: 'USER' }
    });

    const managerRole = await prisma.role.findFirst({
      where: { name: 'PROPERTY_MANAGER' }
    });

    const renterRole = await prisma.role.findFirst({
      where: { name: 'RENTER' }
    });

    if (!adminRole || !userRole || !managerRole || !renterRole) {
      throw new Error('Roles not found. Please run model-migration.js first.');
    }

    // Create an admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Admin User',
        password: hashedPassword,
        userRoles: {
          create: {
            roleId: adminRole.id
          }
        }
      },
    });
    console.log(`Created admin user with ID: ${admin.id}`);

    // Create subscription plans
    const plans = [
      {
        id: 'plan-basic',
        name: 'Basic',
        description: 'For property owners with up to 10 rooms',
        price: 10,
        roomLimit: 10,
        billingCycle: 'MONTHLY' as BillingCycle,
        features: ['Room Management', 'Renter Management', 'Basic Reporting'],
      },
      {
        id: 'plan-standard',
        name: 'Standard',
        description: 'For property owners with 11-50 rooms',
        price: 20,
        roomLimit: 50,
        billingCycle: 'MONTHLY' as BillingCycle,
        features: [
          'Room Management',
          'Renter Management',
          'Advanced Reporting',
          'Contract Management',
          'Payment Tracking',
        ],
      },
      {
        id: 'plan-premium',
        name: 'Premium',
        description: 'For property owners with 51-100 rooms',
        price: 40,
        roomLimit: 100,
        billingCycle: 'MONTHLY' as BillingCycle,
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
      {
        id: 'plan-enterprise',
        name: 'Enterprise',
        description: 'For property owners with over 100 rooms',
        price: 80,
        roomLimit: 999999, // Effectively unlimited
        billingCycle: 'MONTHLY' as BillingCycle,
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
    ];

    // Create subscription plans
    for (const planData of plans) {
      await prisma.subscriptionPlan.upsert({
        where: { id: planData.id },
        update: {},
        create: planData,
      });
    }
    console.log('Created subscription plans');

    // Create property managers (5-10)
    const propertyManagers: User[] = [];
    const numManagers = faker.number.int({ min: 5, max: 10 });
    
    for (let i = 0; i < numManagers; i++) {
      const managerPassword = await bcrypt.hash('Manager@123', 12);
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      
      const manager = await prisma.user.create({
        data: {
          email: faker.internet.email({ firstName, lastName }),
          name: `${firstName} ${lastName}`,
          password: managerPassword,
          userRoles: {
            create: {
              roleId: managerRole.id
            }
          }
        },
      });
      
      propertyManagers.push(manager);
      
      // Create user preferences
      await prisma.userPreference.create({
        data: {
          userId: manager.id,
          darkMode: faker.datatype.boolean(),
          fontSize: faker.helpers.arrayElement(['small', 'medium', 'large']),
          colorTheme: faker.helpers.arrayElement(['default', 'dark', 'light', 'blue', 'green']),
        },
      });
      
      // Create subscription for manager
      const randomPlan = faker.helpers.arrayElement(plans);
      await prisma.subscription.create({
        data: {
          userId: manager.id,
          planId: randomPlan.id,
          status: faker.helpers.arrayElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']),
          autoRenew: faker.datatype.boolean(),
          endDate: faker.date.future(),
        },
      });
    }
    console.log(`Created ${propertyManagers.length} property managers with preferences and subscriptions`);

    // Create properties
    const properties: Property[] = [];
    for (const manager of propertyManagers) {
      const numProperties = faker.number.int({ min: 1, max: NUM_PROPERTIES_PER_USER });
      
      for (let i = 0; i < numProperties; i++) {
        const property = await prisma.property.create({
          data: {
            name: `${faker.company.name()} ${faker.helpers.arrayElement(['Apartments', 'Residences', 'Villas', 'Towers', 'Suites'])}`,
            address: `${faker.location.streetAddress()}, ${faker.location.city()}, ${faker.location.state()} ${faker.location.zipCode()}`,
            userId: manager.id,
          },
        });
        
        properties.push(property);
      }
    }
    console.log(`Created ${properties.length} properties`);

    // Create rooms
    const roomStatuses: RoomStatus[] = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'];
    const rooms: Room[] = [];
    
    for (const property of properties) {
      const numRooms = faker.number.int({ min: 5, max: NUM_ROOMS_PER_PROPERTY });
      
      for (let i = 1; i <= numRooms; i++) {
        const floor = Math.ceil(i / 5);
        const status = faker.helpers.arrayElement(roomStatuses);
        
        const room = await prisma.room.create({
          data: {
            name: `Room ${floor}${i % 5 === 0 ? 5 : i % 5}`,
            number: `${floor}${i % 5 === 0 ? 5 : i % 5}`,
            floor,
            size: 20 + Math.floor(Math.random() * 30),
            description: faker.helpers.arrayElement([
              `Standard room with ${faker.helpers.arrayElement(['garden', 'city', 'pool', 'mountain'])} view.`,
              `Spacious ${faker.helpers.arrayElement(['single', 'double', 'studio'])} room with modern amenities.`,
              `Cozy ${faker.helpers.arrayElement(['single', 'double', 'studio'])} room with private bathroom.`,
              `${faker.helpers.arrayElement(['Deluxe', 'Premium', 'Standard', 'Economy'])} room with ${faker.helpers.arrayElement(['balcony', 'large windows', 'air conditioning', 'heating system'])}.`
            ]),
            status,
            price: 400 + Math.floor(Math.random() * 1000),
            images: [
              `https://example.com/rooms/room${i}_1.jpg`,
              `https://example.com/rooms/room${i}_2.jpg`,
            ],
            propertyId: property.id,
          },
        });
        
        rooms.push(room);
      }
    }
    console.log(`Created ${rooms.length} rooms`);

    // Create renters
    const renters: Renter[] = [];
    for (let i = 0; i < NUM_RENTERS; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      
      const renter = await prisma.renter.create({
        data: {
          name: `${firstName} ${lastName}`,
          email: faker.internet.email({ firstName, lastName }),
          phone: faker.phone.number(),
          emergencyContact: faker.phone.number(),
          identityNumber: faker.string.alphanumeric(8).toUpperCase(),
          roomId: null, // Will assign some later
        },
      });
      
      renters.push(renter);
      
      // Create renter user accounts for some renters
      if (faker.datatype.boolean() && i < NUM_RENTERS / 2) {
        const renterPassword = await bcrypt.hash('Renter@123', 12);
        const renterUser = await prisma.user.create({
          data: {
            email: renter.email!,
            name: renter.name,
            password: renterPassword,
            isRenter: true,
            renterId: renter.id,
            userRoles: {
              create: {
                roleId: renterRole.id
              }
            }
          }
        });
        
        console.log(`Created user account for renter ${renter.name} with ID: ${renterUser.id}`);
      }
    }
    console.log(`Created ${renters.length} renters`);

    // Assign renters to occupied/reserved rooms
    const occupiedRooms = rooms.filter(room => room.status === 'OCCUPIED' || room.status === 'RESERVED');
    const renterToAssign = [...renters];
    
    for (let i = 0; i < Math.min(occupiedRooms.length, renterToAssign.length); i++) {
      await prisma.renter.update({
        where: { id: renterToAssign[i].id },
        data: {
          roomId: occupiedRooms[i].id,
        },
      });
      
      // Create contracts for occupied rooms
      if (occupiedRooms[i].status === 'OCCUPIED') {
        const contractTypes: ContractType[] = ['LONG_TERM', 'SHORT_TERM'];
        const contractType = faker.helpers.arrayElement(contractTypes);
        const startDate = faker.date.past({ years: 1 });
        const endDate = new Date(startDate);
        if (contractType === 'LONG_TERM') {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setMonth(endDate.getMonth() + faker.number.int({ min: 1, max: 6 }));
        }
        const contract = await prisma.contract.create({
          data: {
            name: contractType === 'LONG_TERM' ? 'Annual Lease' : 'Short-term Rental',
            roomId: occupiedRooms[i].id,
            startDate,
            endDate,
            amount: occupiedRooms[i].price,
            securityDeposit: occupiedRooms[i].price * (contractType === 'LONG_TERM' ? 2 : 1),
            contractType,
            status: faker.helpers.arrayElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING']),
            document: `https://example.com/contracts/contract_${i}.pdf`,
            renters: {
              connect: [{ id: renterToAssign[i].id }]
            }
          },
        });
        
        // Create payments for contracts
        const today = new Date();
        const contractMonths = Math.max(1, Math.floor((today.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)));
        
        // Past payments
        for (let j = 0; j < contractMonths; j++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + j);
          
          if (dueDate > today) continue;
          
          const paidDate = new Date(dueDate);
          const isLate = faker.datatype.boolean() && faker.datatype.boolean(); // 25% chance of late payment
          
          if (isLate) {
            paidDate.setDate(paidDate.getDate() + faker.number.int({ min: 1, max: 10 }));
          } else {
            paidDate.setDate(paidDate.getDate() - faker.number.int({ min: 0, max: 5 }));
          }
          
          await prisma.payment.create({
            data: {
              amount: occupiedRooms[i].price,
              status: 'PAID',
              type: 'RENT',
              dueDate,
              paidDate,
              description: `Monthly rent for ${dueDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
              renterId: renterToAssign[i].id,
              contractId: contract.id,
            },
          });
        }
        
        // Add upcoming payment if contract is still active
        if (contract.status === 'ACTIVE' && endDate > today) {
          const upcomingDueDate = new Date(today);
          upcomingDueDate.setDate(1); // First day of month
          upcomingDueDate.setMonth(upcomingDueDate.getMonth() + 1); // Next month
          
          await prisma.payment.create({
            data: {
              amount: occupiedRooms[i].price,
              status: 'PENDING',
              type: 'RENT',
              dueDate: upcomingDueDate,
              description: `Monthly rent for ${upcomingDueDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
              renterId: renterToAssign[i].id,
              contractId: contract.id,
            },
          });
        }
        
        console.log(`Created contract and payments for renter ${renterToAssign[i].name} in room ${occupiedRooms[i].name}`);
      }
    }
    
    console.log('Assigned renters to rooms and created contracts');

    // Create documents for renters
    const docTypes: DocumentType[] = ['ID_CARD', 'PASSPORT', 'CONTRACT', 'OTHER'];
    let documentCount = 0;
    
    for (const renter of renters) {
      const numDocs = faker.number.int({ min: 1, max: 3 }); // 1-3 documents per renter
      
      for (let i = 0; i < numDocs; i++) {
        await prisma.document.create({
          data: {
            name: faker.helpers.arrayElement([
              'ID Card', 'Passport', 'Lease Agreement', 
              'Employment Verification', 'Bank Statement',
              'Reference Letter', 'Pet Certificate'
            ]),
            type: faker.helpers.arrayElement(docTypes),
            path: `https://example.com/documents/doc_${renter.id}_${i}.pdf`,
            renterId: renter.id,
          },
        });
        documentCount++;
      }
    }
    console.log(`Created ${documentCount} documents for renters`);

    // Create services
    const serviceNames = [
      'Wi-Fi', 'Cleaning', 'Laundry', 'Parking', 'Pet Fee',
      'Room Key Replacement', 'Storage', 'Gym Access', 'Pool Access',
      'Cable TV', 'Concierge', 'Breakfast', 'Utilities', 'Furniture Rental'
    ];
    
    const serviceIcons = [
      'wifi', 'clean', 'laundry', 'parking', 'pet',
      'key', 'box', 'dumbbell', 'pool',
      'tv', 'bell', 'coffee', 'bolt', 'chair'
    ];
    
    const feeTypes: FeeType[] = ['ONE_TIME', 'MONTHLY', 'YEARLY'];
    
    const services: Service[] = [];
    for (let i = 0; i < Math.min(serviceNames.length, NUM_SERVICES); i++) {
      const feeType = i < 3 ? 'ONE_TIME' : (i < 10 ? 'MONTHLY' : 'YEARLY');
      
      const service = await prisma.service.create({
        data: {
          name: serviceNames[i],
          description: `${serviceNames[i]} service for residents`,
          fee: 10 + Math.floor(Math.random() * 90),
          feeType: feeType as FeeType,
          icon: serviceIcons[i],
          active: true,
        },
      });
      
      services.push(service);
    }
    console.log(`Created ${services.length} services`);

    // Add services to rooms
    let roomServiceCount = 0;
    for (const room of occupiedRooms) {
      const monthlyServices = services.filter(s => s.feeType === 'MONTHLY');
      const numServices = faker.number.int({ min: 1, max: Math.min(3, monthlyServices.length) });
      
      // Select random services
      const selectedServices = faker.helpers.arrayElements(monthlyServices, numServices);
      
      for (const service of selectedServices) {
        await prisma.roomService.create({
          data: {
            roomId: room.id,
            serviceId: service.id,
            status: faker.helpers.arrayElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']),
            startDate: faker.date.past({ years: 1 }),
          },
        });
        roomServiceCount++;
      }
    }
    console.log(`Added ${roomServiceCount} services to occupied rooms`);

    // Create expenses
    const expenseCategories = ['MAINTENANCE', 'UTILITIES', 'TAXES', 'INSURANCE', 'SALARY', 'SUPPLIES', 'MARKETING', 'OTHER'];
    
    for (let i = 0; i < NUM_EXPENSES; i++) {
      const category = faker.helpers.arrayElement(expenseCategories);
      const date = faker.date.past({ years: 1 });
      
      await prisma.expense.create({
        data: {
          name: `${category.charAt(0) + category.slice(1).toLowerCase()} - ${faker.commerce.productName()}`,
          amount: 50 + Math.floor(Math.random() * 2000),
          date,
          category: category as any,
          description: faker.lorem.sentence(),
          receipt: faker.datatype.boolean() ? `https://example.com/receipts/receipt_${i}.pdf` : null,
        },
      });
    }
    
    console.log(`Created ${NUM_EXPENSES} expenses`);

    // Create maintenance events
    const maintenancePriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    const maintenanceStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    
    // Find rooms in maintenance status
    const maintenanceRooms = rooms.filter(room => room.status === 'MAINTENANCE');
    
    // Create maintenance events for rooms with MAINTENANCE status
    for (const room of maintenanceRooms) {
      await prisma.maintenanceEvent.create({
        data: {
          title: faker.helpers.arrayElement([
            'Plumbing Issue', 'Electrical Problem', 'Heating System Failure',
            'AC Repair', 'Broken Window', 'Door Lock Replacement'
          ]),
          description: faker.lorem.paragraph(),
          status: faker.helpers.arrayElement(['PENDING', 'IN_PROGRESS']),
          priority: faker.helpers.arrayElement(['HIGH', 'URGENT']),
          roomId: room.id,
          scheduledDate: faker.date.recent(),
        },
      });
    }
    
    // Create additional maintenance events for other rooms
    const otherRooms = rooms.filter(room => room.status !== 'MAINTENANCE');
    const roomsForMaintenance = faker.helpers.arrayElements(otherRooms, NUM_MAINTENANCE_EVENTS - maintenanceRooms.length);
    
    for (const room of roomsForMaintenance) {
      const status = faker.helpers.arrayElement(maintenanceStatuses);
      const scheduledDate = status === 'COMPLETED' ? 
        faker.date.past({ years: 0.2 }) : 
        faker.date.soon({ days: 30 });
      
      await prisma.maintenanceEvent.create({
        data: {
          title: faker.helpers.arrayElement([
            'Regular Maintenance', 'Inspection', 'Pest Control',
            'Painting', 'Flooring Repair', 'Furniture Replacement',
            'Deep Cleaning', 'Appliance Service'
          ]),
          description: faker.lorem.paragraph(),
          status: status as any,
          priority: faker.helpers.arrayElement(maintenancePriorities) as any,
          roomId: room.id,
          scheduledDate,
          completedDate: status === 'COMPLETED' ? faker.date.between({ from: scheduledDate, to: new Date() }) : null,
          cost: status === 'COMPLETED' ? 50 + Math.floor(Math.random() * 500) : null,
          notes: status === 'COMPLETED' ? faker.lorem.sentences(2) : null,
        },
      });
    }
    
    console.log(`Created ${maintenanceRooms.length + roomsForMaintenance.length} maintenance events`);

    // Create events and notifications
    const eventTypes = ['ONE_TIME', 'MONTHLY', 'CONTRACT_EXPIRY', 'PAYMENT_DUE'];
    const notifyMethods = ['EMAIL', 'ZALO', 'SMS', 'IN_APP'];
    
    // Create event for contract expiry
    const contractExpiryEvent = await prisma.event.create({
      data: {
        name: 'Contract Expiry Reminder',
        message: 'Your contract will expire soon. Please contact us to discuss renewal options.',
        description: 'Automated reminder for contracts expiring within 30 days',
        eventType: 'CONTRACT_EXPIRY',
        notifyBy: ['EMAIL', 'IN_APP'],
        active: true,
        nextRun: faker.date.soon({ days: 7 }),
        createdById: admin.id,
      },
    });

    // Create event for payment due
    const paymentDueEvent = await prisma.event.create({
      data: {
        name: 'Payment Due Reminder',
        message: 'Your rent payment is due soon. Please make your payment on time to avoid late fees.',
        description: 'Automated reminder for upcoming rent payments',
        eventType: 'PAYMENT_DUE',
        notifyBy: ['EMAIL', 'SMS', 'IN_APP'],
        active: true,
        nextRun: faker.date.soon({ days: 3 }),
        createdById: admin.id,
      },
    });

    // Create monthly maintenance notification
    const maintenanceEvent = await prisma.event.create({
      data: {
        name: 'Monthly Maintenance Notice',
        message: 'We will be conducting regular maintenance in your building. Please ensure access to common areas.',
        description: 'Monthly notification for regular building maintenance',
        eventType: 'MONTHLY',
        scheduleDay: 15, // 15th of each month
        notifyBy: ['EMAIL'],
        active: true,
        nextRun: (() => {
          const date = new Date();
          date.setDate(15);
          if (date.getDate() < 15) {
            date.setMonth(date.getMonth() + 1);
          }
          return date;
        })(),
        createdById: admin.id,
      },
    });

    // Add event targets
    let targetCount = 0;
    
    // Add targets to contract expiry event
    const rentershWithContracts = await prisma.renter.findMany({
      where: {
        contracts: {
          some: {
            status: 'ACTIVE'
          }
        }
      },
      take: 10
    });
    
    for (const renter of rentershWithContracts) {
      await prisma.eventTarget.create({
        data: {
          eventId: contractExpiryEvent.id,
          renterId: renter.id,
        },
      });
      targetCount++;
    }
    
    // Add targets to payment due event
    const rentershWithPayments = await prisma.renter.findMany({
      where: {
        payments: {
          some: {
            status: 'PENDING'
          }
        }
      },
      take: 15
    });
    
    for (const renter of rentershWithPayments) {
      await prisma.eventTarget.create({
        data: {
          eventId: paymentDueEvent.id,
          renterId: renter.id,
        },
      });
      targetCount++;
    }
    
    // Add targets to maintenance event (target rooms)
    const randomRooms = faker.helpers.arrayElements(rooms, 5);
    
    for (const room of randomRooms) {
      await prisma.eventTarget.create({
        data: {
          eventId: maintenanceEvent.id,
          roomId: room.id,
        },
      });
      targetCount++;
    }

    console.log(`Created 3 events with ${targetCount} targets`);

    console.log('✅ Enhanced seeding completed successfully');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 