#!/usr/bin/env node

/**
 * Multi-Tenant Seed Script
 * Creates sample data for multiple cinema companies to test tenant isolation
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Predefined company data
const COMPANIES = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'CineMax Entertainment',
    cnpj: '11.222.333/0001-44',
    tradeName: 'CineMax',
    address: 'Av. Paulista, 1000',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    phone: '(11) 3333-4444',
    email: 'contato@cinemax.com',
    website: 'https://www.cinemax.com'
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'MovieTime Cinemas',
    cnpj: '22.333.444/0001-55',
    tradeName: 'MovieTime',
    address: 'Rua das Flores, 500',
    city: 'Rio de Janeiro',
    state: 'RJ',
    zipCode: '22070-001',
    phone: '(21) 2555-6666',
    email: 'contato@movietime.com',
    website: 'https://www.movietime.com'
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Premium Screens',
    cnpj: '33.444.555/0001-66',
    tradeName: 'Premium',
    address: 'Shopping Center, Piso L3',
    city: 'Belo Horizonte',
    state: 'MG',
    zipCode: '30112-000',
    phone: '(31) 3777-8888',
    email: 'contato@premiumscreens.com',
    website: 'https://www.premiumscreens.com'
  }
];

// Sample movies for each company
const MOVIES_DATA = [
  // CineMax Movies
  [
    { title: 'Action Hero 4', durationMin: 128, genre: 'Action', rating: '14+' },
    { title: 'Space Adventure', durationMin: 145, genre: 'Sci-Fi', rating: '12+' },
    { title: 'Comedy Night', durationMin: 98, genre: 'Comedy', rating: 'L' }
  ],
  // MovieTime Movies
  [
    { title: 'Drama of Hearts', durationMin: 112, genre: 'Drama', rating: '16+' },
    { title: 'Horror Mansion', durationMin: 94, genre: 'Horror', rating: '18+' },
    { title: 'Family Fun', durationMin: 88, genre: 'Family', rating: 'L' }
  ],
  // Premium Screens Movies
  [
    { title: 'Art House Film', durationMin: 156, genre: 'Art', rating: '14+' },
    { title: 'Documentary Earth', durationMin: 102, genre: 'Documentary', rating: 'L' },
    { title: 'Indie Romance', durationMin: 95, genre: 'Romance', rating: '12+' }
  ]
];

// Sample inventory items for each company
const INVENTORY_DATA = [
  // CineMax Inventory
  [
    { sku: 'POPCORN-L', name: 'Large Popcorn', unitPrice: 18.50, qtyOnHand: 150, category: 'Snacks' },
    { sku: 'SODA-M', name: 'Medium Soda', unitPrice: 12.00, qtyOnHand: 200, category: 'Beverages' },
    { sku: 'COMBO-1', name: 'Movie Combo', unitPrice: 28.00, qtyOnHand: 80, category: 'Combos', isCombo: true }
  ],
  // MovieTime Inventory
  [
    { sku: 'POPCORN-XL', name: 'Extra Large Popcorn', unitPrice: 22.00, qtyOnHand: 120, category: 'Snacks' },
    { sku: 'JUICE-N', name: 'Natural Juice', unitPrice: 15.50, qtyOnHand: 100, category: 'Beverages' },
    { sku: 'NACHOS-S', name: 'Nachos with Cheese', unitPrice: 16.00, qtyOnHand: 75, category: 'Snacks' }
  ],
  // Premium Screens Inventory
  [
    { sku: 'WINE-G', name: 'Premium Wine Glass', unitPrice: 35.00, qtyOnHand: 50, category: 'Beverages' },
    { sku: 'TRUFFLE-P', name: 'Chocolate Truffles', unitPrice: 25.00, qtyOnHand: 40, category: 'Premium' },
    { sku: 'CHEESE-B', name: 'Artisan Cheese Board', unitPrice: 45.00, qtyOnHand: 30, category: 'Premium' }
  ]
];

class MultiTenantSeeder {
  async clearExistingData() {
    console.log('🧹 Cleaning existing seed data...');

    // Delete in reverse order of dependencies
    await prisma.auditLog.deleteMany({});
    await prisma.timeEntry.deleteMany({});
    await prisma.saleDiscount.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.saleItem.deleteMany({});
    await prisma.sale.deleteMany({});
    await prisma.ticket.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.inventoryAdjustment.deleteMany({});
    await prisma.food.deleteMany({});
    await prisma.collectable.deleteMany({});
    await prisma.inventoryItem.deleteMany({});
    await prisma.discountCode.deleteMany({});
    await prisma.roomTypePrice.deleteMany({});
    await prisma.seat.deleteMany({});
    await prisma.room.deleteMany({});
    await prisma.seatMap.deleteMany({});
    await prisma.movie.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.person.deleteMany({});
    await prisma.companySubscription.deleteMany({});
    await prisma.systemAdmin.deleteMany({});
    await prisma.company.deleteMany({});

    console.log('✅ Existing data cleaned');
  }

  async createSystemAdmin() {
    console.log('👑 Creating system administrator...');

    const passwordHash = await bcrypt.hash('sysadmin123', 12);

    const systemAdmin = await prisma.systemAdmin.create({
      data: {
        username: 'sysadmin',
        email: 'admin@cinema-system.com',
        passwordHash,
        isActive: true
      }
    });

    console.log(`✅ System Admin created: ${systemAdmin.username}`);
    return systemAdmin;
  }

  async createCompanies() {
    console.log('🏢 Creating cinema companies...');

    const companies = [];

    for (const companyData of COMPANIES) {
      const company = await prisma.company.create({
        data: companyData
      });

      // Create subscription for each company
      const subscription = await prisma.companySubscription.create({
        data: {
          companyId: company.id,
          plan: company.name.includes('Premium') ? 'PREMIUM' : 'BASIC',
          startDate: new Date(),
          maxEmployees: company.name.includes('Premium') ? 100 : 50,
          maxRooms: company.name.includes('Premium') ? 20 : 10,
          monthlyFee: company.name.includes('Premium') ? 299.99 : 99.99,
          isActive: true
        }
      });

      companies.push({ ...company, subscription });
      console.log(`✅ Company created: ${company.name} (${company.cnpj})`);
    }

    return companies;
  }

  async createEmployeesAndCustomers(companies) {
    console.log('👥 Creating employees and customers...');

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const companyIndex = i + 1;

      // Create employees for each company
      const employees = [
        {
          cpf: `${companyIndex}11111111${String(companyIndex).padStart(2, '0')}`,
          fullName: `Admin ${company.tradeName}`,
          email: `admin@${company.tradeName.toLowerCase()}.com`,
          phone: `(11) 9999-${companyIndex}${companyIndex}${companyIndex}${companyIndex}`,
          employeeId: `ADM${companyIndex.toString().padStart(3, '0')}`,
          role: 'ADMIN',
          permissions: { all: true }
        },
        {
          cpf: `${companyIndex}22222222${String(companyIndex).padStart(2, '0')}`,
          fullName: `Manager ${company.tradeName}`,
          email: `manager@${company.tradeName.toLowerCase()}.com`,
          phone: `(11) 8888-${companyIndex}${companyIndex}${companyIndex}${companyIndex}`,
          employeeId: `MGR${companyIndex.toString().padStart(3, '0')}`,
          role: 'MANAGER',
          permissions: { employees: true, inventory: true, reports: true }
        },
        {
          cpf: `${companyIndex}33333333${String(companyIndex).padStart(2, '0')}`,
          fullName: `Cashier ${company.tradeName}`,
          email: `cashier@${company.tradeName.toLowerCase()}.com`,
          phone: `(11) 7777-${companyIndex}${companyIndex}${companyIndex}${companyIndex}`,
          employeeId: `CSH${companyIndex.toString().padStart(3, '0')}`,
          role: 'CASHIER',
          permissions: { sales: true }
        }
      ];

      for (const employeeData of employees) {
        const { cpf, fullName, email, phone, ...empData } = employeeData;

        // Create person
        await prisma.person.create({
          data: { cpf, fullName, email, phone }
        });

        // Create employee
        const passwordHash = await bcrypt.hash('password123', 12);
        await prisma.employee.create({
          data: {
            cpf,
            companyId: company.id,
            ...empData,
            hireDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000), // Random hire date within last year
            passwordHash,
            isActive: true
          }
        });

        console.log(`  ✅ Employee: ${fullName} (${empData.employeeId})`);
      }

      // Create customers for each company
      const customers = [
        {
          cpf: `${companyIndex}44444444${String(companyIndex).padStart(2, '0')}`,
          fullName: `João Silva ${companyIndex}`,
          email: `joao${companyIndex}@email.com`,
          phone: `(11) 6666-${companyIndex}${companyIndex}${companyIndex}${companyIndex}`,
          birthDate: new Date('1985-05-15'),
          loyaltyPoints: Math.floor(Math.random() * 1000)
        },
        {
          cpf: `${companyIndex}55555555${String(companyIndex).padStart(2, '0')}`,
          fullName: `Maria Santos ${companyIndex}`,
          email: `maria${companyIndex}@email.com`,
          phone: `(11) 5555-${companyIndex}${companyIndex}${companyIndex}${companyIndex}`,
          birthDate: new Date('1990-08-22'),
          loyaltyPoints: Math.floor(Math.random() * 500)
        }
      ];

      for (const customerData of customers) {
        const { cpf, fullName, email, phone, ...custData } = customerData;

        // Create person
        await prisma.person.create({
          data: { cpf, fullName, email, phone }
        });

        // Create customer
        await prisma.customer.create({
          data: {
            cpf,
            companyId: company.id,
            ...custData
          }
        });

        console.log(`  ✅ Customer: ${fullName}`);
      }
    }
  }

  async createMoviesAndRooms(companies) {
    console.log('🎬 Creating movies and rooms...');

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const movies = MOVIES_DATA[i];

      // Create movies
      for (const movieData of movies) {
        await prisma.movie.create({
          data: {
            companyId: company.id,
            ...movieData,
            description: `A great ${movieData.genre.toLowerCase()} movie from ${company.tradeName}`,
            releaseDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000), // Random release within 6 months
            isActive: true
          }
        });

        console.log(`  ✅ Movie: ${movieData.title}`);
      }

      // Create seat maps
      const seatMap = await prisma.seatMap.create({
        data: {
          companyId: company.id,
          name: `${company.tradeName} Standard Layout`,
          rows: 10,
          cols: 12,
          version: 1,
          layout: {
            vipRows: [1, 2],
            accessibleSeats: ['A6', 'A7', 'B6', 'B7'],
            emergencyExits: ['A1', 'A12', 'J1', 'J12']
          }
        }
      });

      // Create seats for the seat map
      const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      for (let row = 0; row < 10; row++) {
        for (let col = 1; col <= 12; col++) {
          const seatId = `${rows[row]}${col}`;
          const isAccessible = ['A6', 'A7', 'B6', 'B7'].includes(seatId);

          await prisma.seat.create({
            data: {
              seatMapId: seatMap.id,
              id: seatId,
              rowLabel: rows[row],
              number: col,
              isAccessible,
              isActive: true
            }
          });
        }
      }

      // Create rooms
      const roomTypes = ['TWO_D', 'THREE_D', 'IMAX'];
      for (let roomNum = 1; roomNum <= 3; roomNum++) {
        await prisma.room.create({
          data: {
            companyId: company.id,
            name: `Sala ${roomNum}`,
            capacity: 120,
            roomType: roomTypes[(roomNum - 1) % roomTypes.length],
            seatMapId: seatMap.id,
            isActive: true
          }
        });

        console.log(`  ✅ Room: Sala ${roomNum}`);
      }

      // Create room type prices
      await prisma.roomTypePrice.createMany({
        data: [
          { companyId: company.id, roomType: 'TWO_D', price: 20.00 },
          { companyId: company.id, roomType: 'THREE_D', price: 25.00 },
          { companyId: company.id, roomType: 'IMAX', price: 35.00 },
          { companyId: company.id, roomType: 'VIP', price: 45.00 }
        ]
      });
    }
  }

  async createInventoryAndDiscounts(companies) {
    console.log('📦 Creating inventory and discounts...');

    for (let i = 0; i < companies.length; i++) {
      const company = companies[i];
      const inventory = INVENTORY_DATA[i];

      // Create inventory items
      for (const itemData of inventory) {
        const { category, isCombo, ...baseData } = itemData;

        const _inventoryItem = await prisma.inventoryItem.create({
          data: {
            companyId: company.id,
            ...baseData,
            reorderLevel: Math.floor(baseData.qtyOnHand * 0.2), // 20% of stock
            barcode: `${company.id.slice(-4)}${itemData.sku}`,
            isActive: true
          }
        });

        // Create food-specific data
        if (category) {
          await prisma.food.create({
            data: {
              companyId: company.id,
              sku: itemData.sku,
              expiryDate: category === 'Beverages' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              isCombo: isCombo || false,
              category
            }
          });
        }

        console.log(`  ✅ Inventory: ${itemData.name}`);
      }

      // Create discount codes
      const discounts = [
        {
          code: 'WELCOME10',
          description: 'Welcome discount - 10% off',
          type: 'PERCENT',
          value: 10.00,
          validFrom: new Date(),
          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          maxUses: 1000,
          isActive: true
        },
        {
          code: 'STUDENT20',
          description: 'Student discount - R$ 20 off',
          type: 'AMOUNT',
          value: 20.00,
          validFrom: new Date(),
          validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          maxUses: 500,
          isActive: true
        }
      ];

      for (const discountData of discounts) {
        await prisma.discountCode.create({
          data: {
            companyId: company.id,
            ...discountData,
            currentUses: 0
          }
        });

        console.log(`  ✅ Discount: ${discountData.code}`);
      }
    }
  }

  async createSampleSessions(companies) {
    console.log('📅 Creating sample sessions...');

    for (const company of companies) {
      const movies = await prisma.movie.findMany({
        where: { companyId: company.id }
      });

      const rooms = await prisma.room.findMany({
        where: { companyId: company.id }
      });

      // Create sessions for next 7 days
      for (let day = 0; day < 7; day++) {
        const sessionDate = new Date();
        sessionDate.setDate(sessionDate.getDate() + day);

        for (let sessionTime = 0; sessionTime < 3; sessionTime++) {
          const startHour = 14 + (sessionTime * 3); // 14h, 17h, 20h
          const startTime = new Date(sessionDate);
          startTime.setHours(startHour, 0, 0, 0);

          const movie = movies[Math.floor(Math.random() * movies.length)];
          const room = rooms[Math.floor(Math.random() * rooms.length)];

          const endTime = new Date(startTime);
          endTime.setMinutes(startTime.getMinutes() + movie.durationMin + 30); // Movie + 30min cleanup

          await prisma.session.create({
            data: {
              companyId: company.id,
              movieId: movie.id,
              roomId: room.id,
              startTime,
              endTime,
              status: 'SCHEDULED'
            }
          });
        }
      }

      console.log(`  ✅ Sessions created for ${company.tradeName}`);
    }
  }

  async generateSampleTimeEntries(companies) {
    console.log('⏰ Creating sample time entries...');

    for (const company of companies) {
      const employees = await prisma.employee.findMany({
        where: { companyId: company.id }
      });

      // Create time entries for the last 7 days
      for (let day = 0; day < 7; day++) {
        const entryDate = new Date();
        entryDate.setDate(entryDate.getDate() - day);

        for (const employee of employees) {
          // Skip weekends for some variety
          if (entryDate.getDay() === 0 || entryDate.getDay() === 6) {
            if (Math.random() < 0.7) continue; // 70% chance to skip weekend
          }

          // Clock in
          const clockInTime = new Date(entryDate);
          clockInTime.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60), 0, 0);

          await prisma.timeEntry.create({
            data: {
              companyId: company.id,
              employeeCpf: employee.cpf,
              entryType: 'CLOCK_IN',
              timestamp: clockInTime,
              location: 'Main Entrance',
              ipAddress: '192.168.1.10'
            }
          });

          // Clock out
          const clockOutTime = new Date(clockInTime);
          clockOutTime.setHours(clockOutTime.getHours() + 8 + Math.floor(Math.random() * 2)); // 8-10 hour shift

          await prisma.timeEntry.create({
            data: {
              companyId: company.id,
              employeeCpf: employee.cpf,
              entryType: 'CLOCK_OUT',
              timestamp: clockOutTime,
              location: 'Main Entrance',
              ipAddress: '192.168.1.10'
            }
          });
        }
      }

      console.log(`  ✅ Time entries created for ${company.tradeName}`);
    }
  }

  async run() {
    try {
      console.log('🌱 Starting Multi-Tenant Seed Process...');
      console.log('==========================================');

      await this.clearExistingData();
      const _systemAdmin = await this.createSystemAdmin();
      const companies = await this.createCompanies();
      await this.createEmployeesAndCustomers(companies);
      await this.createMoviesAndRooms(companies);
      await this.createInventoryAndDiscounts(companies);
      await this.createSampleSessions(companies);
      await this.generateSampleTimeEntries(companies);

      console.log('\n🎉 Multi-Tenant Seed Completed Successfully!');
      console.log('============================================');
      console.log('\n📊 Summary:');
      console.log(`🏢 Companies: ${companies.length}`);
      console.log('👑 System Admins: 1');

      for (const company of companies) {
        const stats = await this.getCompanyStats(company.id);
        console.log(`\n🏢 ${company.name} (${company.tradeName}):`);
        console.log(`   👥 Employees: ${stats.employees}`);
        console.log(`   🎭 Customers: ${stats.customers}`);
        console.log(`   🎬 Movies: ${stats.movies}`);
        console.log(`   🏛️  Rooms: ${stats.rooms}`);
        console.log(`   📅 Sessions: ${stats.sessions}`);
        console.log(`   📦 Inventory Items: ${stats.inventory}`);
        console.log(`   🎟️  Discounts: ${stats.discounts}`);
      }

      console.log('\n🔐 Login Credentials:');
      console.log('=====================');
      console.log('System Admin:');
      console.log('  Username: sysadmin');
      console.log('  Password: sysadmin123');

      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        const companyIndex = i + 1;
        console.log(`\n${company.name}:`);
        console.log(`  Admin:   ADM${companyIndex.toString().padStart(3, '0')} / password123`);
        console.log(`  Manager: MGR${companyIndex.toString().padStart(3, '0')} / password123`);
        console.log(`  Cashier: CSH${companyIndex.toString().padStart(3, '0')} / password123`);
      }

      console.log('\n🧪 Testing Commands:');
      console.log('===================');
      console.log('# Generate tokens for each tenant:');
      companies.forEach((company, i) => {
        const companyIndex = i + 1;
        console.log(`docker-compose exec api node scripts/generate-token-multitenant.js ${company.id} ADM${companyIndex.toString().padStart(3, '0')}`);
      });

      console.log('\n# Generate system admin token:');
      console.log('docker-compose exec api node scripts/generate-sysadmin-token.js sysadmin');

    } catch (error) {
      console.error('❌ Seed failed:', error);
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  }

  async getCompanyStats(companyId) {
    const [employees, customers, movies, rooms, sessions, inventory, discounts] = await Promise.all([
      prisma.employee.count({ where: { companyId } }),
      prisma.customer.count({ where: { companyId } }),
      prisma.movie.count({ where: { companyId } }),
      prisma.room.count({ where: { companyId } }),
      prisma.session.count({ where: { companyId } }),
      prisma.inventoryItem.count({ where: { companyId } }),
      prisma.discountCode.count({ where: { companyId } })
    ]);

    return { employees, customers, movies, rooms, sessions, inventory, discounts };
  }
}

// Run the seeder
if (require.main === module) {
  const seeder = new MultiTenantSeeder();
  seeder.run()
    .then(() => {
      console.log('\n✅ Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = MultiTenantSeeder;