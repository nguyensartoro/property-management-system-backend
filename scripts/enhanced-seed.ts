import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { faker } from '@faker-js/faker';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Configuration for how many records to create
const NUM_USERS = 20;
const NUM_PROPERTIES_PER_USER = 2; // Each user will have 1-3 properties
const NUM_ROOMS_PER_PROPERTY = 15; // Each property will have 8-20 rooms
const NUM_RENTERS = 50;
const NUM_SERVICES = 10;
const NUM_EXPENSES = 50;
const NUM_MAINTENANCE_EVENTS = 50;

async function main() {
  console.log('Starting enhanced seeding...');

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

    // Create subscription plans
    const plans = [
      {
        id: 'plan-basic',
        name: 'Basic',
        description: 'For property owners with up to 10 rooms',
        price: 10,
        roomLimit: 10,
        billingCycle: 'MONTHLY',
        features: ['Room Management', 'Renter Management', 'Basic Reporting'],
      },
      {
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
      {
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
      {
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
    ];

    // Create subscription plans
    for (const planData of plans) {
      await prisma.subscriptionPlan.upsert({
        where: { id: planData.id },
        update: {},
        create: planData as any,
      });
    }
    console.log('Created subscription plans');

    // Create regular users
    const users = [];
    for (let i = 0; i < NUM_USERS; i++) {
      const userPassword = await bcrypt.hash('User@123', 12);
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      
      const user = await prisma.user.create({
        data: {
          email: faker.internet.email({ firstName, lastName }),
          name: `${firstName} ${lastName}`,
          password: userPassword,
          role: 'USER',
        },
      });
      
      users.push(user);
      
      // Create user preferences
      await prisma.userPreference.create({
        data: {
          userId: user.id,
          darkMode: faker.datatype.boolean(),
          fontSize: faker.helpers.arrayElement(['small', 'medium', 'large']),
          colorTheme: faker.helpers.arrayElement(['default', 'dark', 'light', 'blue', 'green']),
        },
      });
      
      // Create subscription for user
      const randomPlan = faker.helpers.arrayElement(plans);
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: randomPlan.id,
          status: faker.helpers.arrayElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']),
          autoRenew: faker.datatype.boolean(),
          endDate: faker.date.future(),
        },
      });
    }
    console.log(`Created ${users.length} users with preferences and subscriptions`);

    // Create properties
    const properties = [];
    for (const user of users) {
      const numProperties = Math.max(1, Math.floor(Math.random() * NUM_PROPERTIES_PER_USER) + 1);
      
      for (let i = 0; i < numProperties; i++) {
        const property = await prisma.property.create({
          data: {
            name: faker.company.name() + ' ' + faker.helpers.arrayElement(['Apartments', 'Residences', 'Villas', 'Towers', 'Suites']),
            address: faker.location.streetAddress() + ', ' + faker.location.city() + ', ' + faker.location.state() + ' ' + faker.location.zipCode(),
            userId: user.id,
          },
        });
        
        properties.push(property);
      }
    }
    console.log(`Created ${properties.length} properties`);

    // Create rooms
    const roomStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'];
    const rooms = [];
    
    for (const property of properties) {
      const numRooms = Math.max(5, Math.floor(Math.random() * NUM_ROOMS_PER_PROPERTY) + 1);
      
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
            status: status as any,
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
    const renters = [];
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
    }
    console.log(`Created ${renters.length} renters`);

    // Create documents for renters
    const docTypes = ['ID_CARD', 'PASSPORT', 'CONTRACT', 'OTHER'];
    let documentCount = 0;
    
    for (const renter of renters) {
      const numDocs = 1 + Math.floor(Math.random() * 3); // 1-3 documents per renter
      
      for (let i = 0; i < numDocs; i++) {
        await prisma.document.create({
          data: {
            name: faker.helpers.arrayElement([
              'ID Card', 'Passport', 'Lease Agreement', 
              'Employment Verification', 'Bank Statement',
              'Reference Letter', 'Pet Certificate'
            ]),
            type: faker.helpers.arrayElement(docTypes) as any,
            path: `https://example.com/documents/${renter.id}_${i}.pdf`,
            renterId: renter.id,
          },
        });
        documentCount++;
      }
    }
    console.log(`Created ${documentCount} documents`);

    // Assign renters to rooms and create contracts
    const occupiedRooms = rooms.filter(room => room.status === 'OCCUPIED');
    const availableRenters = [...renters];
    let contractCount = 0;
    let paymentCount = 0;
    
    for (const room of occupiedRooms) {
      if (availableRenters.length === 0) break;
      
      // Assign a random renter to this room
      const renterIndex = Math.floor(Math.random() * availableRenters.length);
      const renter = availableRenters[renterIndex];
      
      // Remove this renter from available renters
      availableRenters.splice(renterIndex, 1);
      
      // Update renter with room
      await prisma.renter.update({
        where: { id: renter.id },
        data: { roomId: room.id },
      });
      
      // Create contract
      const startDate = faker.date.past({ years: 1 });
      const isLongTerm = faker.datatype.boolean(0.7); // 70% long term
      const endDate = new Date(startDate);
      
      if (isLongTerm) {
        endDate.setFullYear(endDate.getFullYear() + 1); // 1 year
      } else {
        endDate.setMonth(endDate.getMonth() + faker.number.int({ min: 1, max: 6 })); // 1-6 months
      }
      
      const contract = await prisma.contract.create({
        data: {
          name: isLongTerm ? 'Annual Lease' : 'Short-term Rental',
          renterId: renter.id,
          roomId: room.id,
          startDate,
          endDate,
          amount: room.price,
          securityDeposit: room.price * faker.number.float({ min: 1, max: 2, fractionDigits: 1 }),
          isLongTerm,
          status: faker.helpers.arrayElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'PENDING']),
          document: `https://example.com/contracts/contract_${renter.id}.pdf`,
        },
      });
      contractCount++;
      
      // Create payments for this contract
      const currentDate = new Date();
      const monthsDiff = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                         (currentDate.getMonth() - startDate.getMonth());
      
      // Create past and future payments (up to 6 months in the future)
      const totalPayments = Math.min(monthsDiff + 6, 24); // Max 2 years of payments
      
      for (let i = 0; i < totalPayments; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);
        
        // Payments before current date are either PAID or OVERDUE
        // Future payments are PENDING
        let status = 'PENDING';
        let paidDate = null;
        
        if (dueDate < currentDate) {
          if (Math.random() < 0.9) { // 90% paid on time
            status = 'PAID';
            paidDate = new Date(dueDate);
            paidDate.setDate(dueDate.getDate() - Math.floor(Math.random() * 5)); // Paid 0-4 days early
          } else {
            status = 'OVERDUE';
          }
        }
        
        await prisma.payment.create({
          data: {
            amount: room.price,
            status: status as any,
            type: 'RENT',
            dueDate,
            paidDate,
            description: `Monthly rent for ${dueDate.toLocaleString('default', { month: 'long' })} ${dueDate.getFullYear()}`,
            renterId: renter.id,
            contractId: contract.id,
          },
        });
        paymentCount++;
      }
      
      // Add initial security deposit payment
      await prisma.payment.create({
        data: {
          amount: contract.securityDeposit || room.price,
          status: 'PAID',
          type: 'DEPOSIT',
          dueDate: startDate,
          paidDate: startDate,
          description: 'Security deposit',
          renterId: renter.id,
          contractId: contract.id,
        },
      });
      paymentCount++;
    }
    console.log(`Created ${contractCount} contracts and ${paymentCount} payments`);

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
      {
        name: 'Room Painting',
        description: 'Interior painting service',
        fee: 200,
        feeType: 'ONE_TIME',
        icon: 'paint',
      },
      {
        name: 'Furniture Rental',
        description: 'Monthly furniture rental',
        fee: 75,
        feeType: 'MONTHLY',
        icon: 'furniture',
      },
      {
        name: 'Cable TV',
        description: 'Premium cable television',
        fee: 35,
        feeType: 'MONTHLY',
        icon: 'tv',
      },
      {
        name: 'Gym Access',
        description: 'Access to on-site gym',
        fee: 30,
        feeType: 'MONTHLY',
        icon: 'gym',
      },
      {
        name: 'Pool Access',
        description: 'Access to swimming pool',
        fee: 25,
        feeType: 'MONTHLY',
        icon: 'pool',
      },
    ];

    const createdServices = [];
    for (const serviceData of services) {
      const service = await prisma.service.create({
        data: serviceData as any,
      });
      createdServices.push(service);
    }
    console.log(`Created ${createdServices.length} services`);

    // Add services to rooms
    let roomServiceCount = 0;
    
    for (const room of occupiedRooms) {
      // Each occupied room gets 1-4 services
      const numServices = 1 + Math.floor(Math.random() * 4);
      const shuffledServices = [...createdServices].sort(() => 0.5 - Math.random());
      
      for (let i = 0; i < Math.min(numServices, shuffledServices.length); i++) {
        const service = shuffledServices[i];
        
        const roomService = await prisma.roomService.create({
          data: {
            roomId: room.id,
            serviceId: service.id,
            status: faker.helpers.arrayElement(['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE']),
            startDate: faker.date.past({ years: 1 }),
            endDate: Math.random() > 0.8 ? faker.date.future() : null,
          },
        });
        
        // Create payments for monthly services
        if (service.feeType === 'MONTHLY') {
          const startDate = roomService.startDate;
          const currentDate = new Date();
          const monthsDiff = (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
                            (currentDate.getMonth() - startDate.getMonth());
          
          // Create payments for up to monthsDiff months
          for (let j = 0; j < monthsDiff; j++) {
            const dueDate = new Date(startDate);
            dueDate.setMonth(startDate.getMonth() + j);
            
            // Find the renter for this room
            const renter = renters.find(r => r.roomId === room.id);
            
            if (renter) {
              let status = 'PENDING';
              let paidDate = null;
              
              if (dueDate < currentDate) {
                if (Math.random() < 0.9) { // 90% paid on time
                  status = 'PAID';
                  paidDate = new Date(dueDate);
                  paidDate.setDate(dueDate.getDate() - Math.floor(Math.random() * 5)); // Paid 0-4 days early
                } else {
                  status = 'OVERDUE';
                }
              }
              
              await prisma.payment.create({
                data: {
                  amount: service.fee,
                  status: status as any,
                  type: 'SERVICE',
                  dueDate,
                  paidDate,
                  description: `${service.name} for ${dueDate.toLocaleString('default', { month: 'long' })} ${dueDate.getFullYear()}`,
                  renterId: renter.id,
                  roomServiceId: roomService.id,
                },
              });
              paymentCount++;
            }
          }
        }
        
        roomServiceCount++;
      }
    }
    console.log(`Created ${roomServiceCount} room services`);

    // Create maintenance events
    const maintenanceEvents = [];
    const maintenanceTitles = [
      'Fix leaking faucet', 'Replace AC filter', 'Fix broken window',
      'Plumbing repair', 'Electrical issue', 'Paint touchup',
      'Fix door lock', 'Repair ceiling fan', 'Replace light fixtures',
      'Fix broken tiles', 'Repair dishwasher', 'HVAC maintenance',
      'Unclog drain', 'Pest control', 'Replace smoke detector',
      'Fix cabinet hinges', 'Repair shower head', 'Fix garbage disposal',
      'Replace door knob', 'Fix toilet flush', 'Repair blinds'
    ];
    
    const maintenanceDescriptions = [
      'Needs immediate attention',
      'Routine maintenance required',
      'Tenant reported issue',
      'Follow-up from previous repair',
      'Annual maintenance check',
      'Safety concern reported',
      'Preventative maintenance needed',
      'Part replacement required'
    ];
    
    // Create maintenance events for random rooms
    for (let i = 0; i < NUM_MAINTENANCE_EVENTS; i++) {
      const room = faker.helpers.arrayElement(rooms);
      const isPast = Math.random() < 0.6; // 60% past, 40% future
      const isHighPriority = Math.random() < 0.3; // 30% high priority
      const isCompleted = isPast && Math.random() < 0.7; // 70% of past events are completed
      
      const scheduledDate = isPast 
        ? faker.date.past({ years: 1 }) 
        : faker.date.future({ years: 1 });
      
      const status = isCompleted 
        ? 'COMPLETED' 
        : isPast 
          ? faker.helpers.arrayElement(['IN_PROGRESS', 'PENDING', 'CANCELLED']) 
          : 'PENDING';
          
      const priority = isHighPriority 
        ? 'HIGH' 
        : faker.helpers.arrayElement(['LOW', 'MEDIUM', 'MEDIUM']);
        
      const completedDate = isCompleted 
        ? new Date(scheduledDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) // 0-7 days after scheduled
        : null;
        
      const cost = isCompleted 
        ? Math.floor(Math.random() * 500) + 50 // $50-$550
        : null;
      
      const event = await prisma.maintenanceEvent.create({
        data: {
          title: faker.helpers.arrayElement(maintenanceTitles),
          description: faker.helpers.arrayElement(maintenanceDescriptions),
          status: status as any,
          priority: priority as any,
          roomId: room.id,
          scheduledDate,
          completedDate,
          cost,
          notes: isCompleted ? faker.lorem.sentence() : null,
        },
      });
      
      maintenanceEvents.push(event);
      
      // Update room status to MAINTENANCE if it's a high priority active event
      if (priority === 'HIGH' && (status === 'PENDING' || status === 'IN_PROGRESS')) {
        await prisma.room.update({
          where: { id: room.id },
          data: { status: 'MAINTENANCE' },
        });
      }
    }
    console.log(`Created ${maintenanceEvents.length} maintenance events`);

    // Create expenses
    const expenseCategories = ['MAINTENANCE', 'UTILITIES', 'TAXES', 'INSURANCE', 'SALARY', 'SUPPLIES', 'MARKETING', 'OTHER'];
    const expenseNames: Record<string, string[]> = {
      'MAINTENANCE': ['Plumbing Repair', 'Electrical Work', 'HVAC Service', 'Roof Repair', 'Painting', 'Flooring Repair'],
      'UTILITIES': ['Electricity Bill', 'Water Bill', 'Gas Bill', 'Internet Service', 'Garbage Collection'],
      'TAXES': ['Property Tax', 'Income Tax', 'Sales Tax', 'Employment Tax'],
      'INSURANCE': ['Property Insurance', 'Liability Insurance', 'Workers Comp', 'Flood Insurance'],
      'SALARY': ['Property Manager Salary', 'Maintenance Staff Wages', 'Administrative Wages', 'Bonus Payments'],
      'SUPPLIES': ['Cleaning Supplies', 'Office Supplies', 'Maintenance Tools', 'Common Area Furniture'],
      'MARKETING': ['Online Listings', 'Promotional Materials', 'Photography Services', 'Virtual Tours'],
      'OTHER': ['Legal Fees', 'Accounting Services', 'Software Subscriptions', 'Miscellaneous Expenses']
    };
    
    const expenses = [];
    for (let i = 0; i < NUM_EXPENSES; i++) {
      const category = faker.helpers.arrayElement(expenseCategories);
      const name = faker.helpers.arrayElement(expenseNames[category] || expenseNames['OTHER']);
      
      const expense = await prisma.expense.create({
        data: {
          name: name,
          amount: Math.floor(Math.random() * 2000) + 100, // $100-$2100
          date: faker.date.past({ years: 1 }),
          category: category as any,
          description: faker.lorem.sentence(),
          receipt: Math.random() > 0.3 ? `https://example.com/receipts/receipt_${i}.pdf` : null,
        },
      });
      
      expenses.push(expense);
    }
    console.log(`Created ${expenses.length} expenses`);

    console.log('Enhanced seeding completed successfully');
  } catch (error) {
    console.error('Error during enhanced seeding:', error);
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