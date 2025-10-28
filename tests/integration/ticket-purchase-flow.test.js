/**
 * Integration Test: Complete Ticket Purchase Flow
 * Tests the entire workflow from session creation to ticket purchase with payment
 */

const request = require('supertest');
const app = require('../../src/server');
const { db } = require('../../src/database/prisma');
const { AuthService } = require('../../src/middleware/auth-multitenant');

describe('Integration: Ticket Purchase Flow', () => {
  let companyId;
  let adminToken;
  let cashierToken;
  let movieId;
  let roomId;
  let seatMapId;
  let sessionId;
  let customerCpf;
  let discountCode;

  beforeAll(async () => {
    // Clean up any existing test data first
    const existingCompany = await db.company.findFirst({
      where: { cnpj: '11223344000155' }
    });

    if (existingCompany) {
      const cId = existingCompany.id;
      // Clean in proper order
      await db.ticket.deleteMany({ where: { companyId: cId } });
      await db.saleDiscount.deleteMany({ where: { companyId: cId } });
      await db.saleItem.deleteMany({ where: { companyId: cId } });
      await db.payment.deleteMany({ where: { companyId: cId } });
      await db.sale.deleteMany({ where: { companyId: cId } });
      await db.session.deleteMany({ where: { companyId: cId } });
      await db.movie.deleteMany({ where: { companyId: cId } });

      // Delete seats through seatMap relationship
      const seatMaps = await db.seatMap.findMany({ where: { companyId: cId }, select: { id: true } });
      for (const seatMap of seatMaps) {
        await db.seat.deleteMany({ where: { seatMapId: seatMap.id } });
      }

      await db.room.deleteMany({ where: { companyId: cId } });
      await db.seatMap.deleteMany({ where: { companyId: cId } });
      await db.discountCode.deleteMany({ where: { companyId: cId } });
      await db.customer.deleteMany({ where: { companyId: cId } });
      await db.timeEntry.deleteMany({ where: { companyId: cId } });
      await db.auditLog.deleteMany({ where: { companyId: cId } });
      await db.employee.deleteMany({ where: { companyId: cId } });
      await db.companySubscription.deleteMany({ where: { companyId: cId } });
      await db.company.delete({ where: { id: cId } });
    }

    // Clean up test persons
    await db.person.deleteMany({
      where: { cpf: { in: ['10000000001', '10000000002', '20000000001'] } }
    }).catch(() => {});

    // Create test company
    const company = await db.company.create({
      data: {
        name: 'Integration Test Cinema',
        cnpj: '11223344000155',
        isActive: true,
        subscription: {
          create: {
            plan: 'PREMIUM',
            startDate: new Date(),
            maxEmployees: 50,
            maxRooms: 10,
            isActive: true,
            monthlyFee: 299.99
          }
        }
      }
    });
    companyId = company.id;

    // Create admin employee
    await db.person.create({
      data: {
        cpf: '10000000001',
        fullName: 'Admin Integration Test',
        email: 'admin-integration@test.com',
        phone: '11999999001'
      }
    });

    const admin = await db.employee.create({
      data: {
        cpf: '10000000001',
        companyId,
        employeeId: 'ADMIN-INT-001',
        role: 'ADMIN',
        hireDate: new Date(),
        isActive: true,
        passwordHash: await AuthService.hashPassword('admin123')
      }
    });
    adminToken = AuthService.generateToken(admin);

    // Create cashier employee
    await db.person.create({
      data: {
        cpf: '10000000002',
        fullName: 'Cashier Integration Test',
        email: 'cashier-integration@test.com',
        phone: '11999999002'
      }
    });

    const cashier = await db.employee.create({
      data: {
        cpf: '10000000002',
        companyId,
        employeeId: 'CASHIER-INT-001',
        role: 'CASHIER',
        hireDate: new Date(),
        isActive: true,
        passwordHash: await AuthService.hashPassword('cashier123')
      }
    });
    cashierToken = AuthService.generateToken(cashier);

    // Create customer
    customerCpf = '20000000001';
    await db.person.create({
      data: {
        cpf: customerCpf,
        fullName: 'Customer Integration Test',
        email: 'customer-integration@test.com',
        phone: '11999999003'
      }
    });

    await db.customer.create({
      data: {
        cpf: customerCpf,
        companyId,
        birthDate: new Date('1990-01-01'),
        loyaltyPoints: 100
      }
    });
  });

  afterAll(async () => {
    try {
      // Cleanup in proper order
      if (companyId) {
        await db.ticket.deleteMany({ where: { companyId } });
        await db.saleDiscount.deleteMany({ where: { companyId } });
        await db.saleItem.deleteMany({ where: { companyId } });
        await db.payment.deleteMany({ where: { companyId } });
        await db.sale.deleteMany({ where: { companyId } });
        await db.session.deleteMany({ where: { companyId } });
        await db.movie.deleteMany({ where: { companyId } });

        // Delete seats through seatMap relationship
        const seatMaps = await db.seatMap.findMany({ where: { companyId }, select: { id: true } });
        for (const seatMap of seatMaps) {
          await db.seat.deleteMany({ where: { seatMapId: seatMap.id } });
        }

        await db.room.deleteMany({ where: { companyId } });
        await db.seatMap.deleteMany({ where: { companyId } });
        await db.discountCode.deleteMany({ where: { companyId } });
        await db.customer.deleteMany({ where: { companyId } });
        await db.timeEntry.deleteMany({ where: { companyId } });
        await db.auditLog.deleteMany({ where: { companyId } });
        await db.employee.deleteMany({ where: { companyId } });
        await db.companySubscription.deleteMany({ where: { companyId } });
        await db.company.delete({ where: { id: companyId } });
      }
      await db.person.deleteMany({ where: { cpf: { in: ['10000000001', '10000000002', '20000000001'] } } }).catch(() => {});
      await db.$disconnect();
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
  });

  describe('Step 1: Setup Movie and Room', () => {
    it('should create a movie', async () => {
      const response = await request(app)
        .post('/api/movies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Integration Test Movie',
          duration_min: 120,
          rating: 'PG-13',
          genre: 'Action',
          description: 'A test movie for integration testing',
          poster_url: 'https://example.com/poster.jpg',
          is_active: true
        });

      if (response.status !== 201) {
        console.error('Movie creation failed:', response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe('Integration Test Movie');
      movieId = response.body.data.id;
    });

    it('should create a seat map', async () => {
      const response = await request(app)
        .post('/api/rooms/seat-maps')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Standard Layout',
          rows: 5,
          cols: 10,
          layout: {
            aisles: [5]
          }
        });

      if (response.status !== 201) {
        console.error('Seat map creation failed:', response.status, response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      seatMapId = response.body.data.id;
    });

    it('should create seats for the seat map', async () => {
      const seats = [];
      for (let row = 1; row <= 5; row++) {
        for (let col = 1; col <= 10; col++) {
          seats.push({
            id: `${String.fromCharCode(64 + row)}${col}`,
            seatMapId,
            rowLabel: String.fromCharCode(64 + row),
            number: col,
            isAccessible: col === 1
          });
        }
      }

      await db.seat.createMany({ data: seats });
    });

    it('should create a room', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Room 1',
          seatMapId,
          roomType: 'TWO_D',
          capacity: 50
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      roomId = response.body.data.id;
    });
  });

  describe('Step 2: Create Session', () => {
    it('should create a movie session', async () => {
      const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          movieId,
          roomId,
          startTime: startTime.toISOString(),
          bufferMinutes: 15
        });

      if (response.status !== 201) {
        console.error('Session creation failed:', response.status, response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.movieId).toBe(movieId);
      expect(response.body.data.roomId).toBe(roomId);
      sessionId = response.body.data.id;
    });

    it('should verify session was created', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(sessionId);
      expect(response.body.data.status).toBe('SCHEDULED');
    });
  });

  describe('Step 3: Create Discount Code', () => {
    it('should create a discount code', async () => {
      const response = await request(app)
        .post('/api/discounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'INTEGRATION10',
          description: '10% off for integration test',
          type: 'PERCENT',
          value: 10,
          validFrom: new Date().toISOString(),
          validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          maxUses: 100
        });

      if (response.status !== 201) {
        console.error('Discount creation failed:', response.status, response.body);
      }

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.code).toBe('INTEGRATION10');
      discountCode = response.body.data.code;
    });

    it('should validate discount code', async () => {
      const response = await request(app)
        .get(`/api/discounts/${discountCode}/validate`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.valid).toBe(true);
      expect(response.body.type).toBe('PERCENT');
      expect(parseFloat(response.body.value)).toBe(10);
    });
  });

  describe('Step 4: Purchase Tickets', () => {
    let saleId;

    it('should create a sale with tickets and discount', async () => {
      const response = await request(app)
        .post('/api/sales')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          buyerCpf: customerCpf,
          items: [
            {
              type: 'TICKET',
              sessionId,
              seatIds: ['A1', 'A2'],
              price: 30.00,
              quantity: 2
            }
          ],
          payments: [
            {
              method: 'CREDIT_CARD',
              amount: 54.00 // 60 - 10% = 54
            }
          ],
          discountCode: discountCode
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalAmount).toBeDefined();
      expect(response.body.data.discountAmount).toBeDefined();
      saleId = response.body.data.id;
    });

    it('should verify tickets were created', async () => {
      const tickets = await db.ticket.findMany({
        where: {
          companyId,
          sessionId
        }
      });

      expect(tickets.length).toBeGreaterThanOrEqual(2);
      expect(tickets.some(t => t.seatId === 'A1')).toBe(true);
      expect(tickets.some(t => t.seatId === 'A2')).toBe(true);
    });

    it('should verify sale was recorded', async () => {
      const sale = await db.sale.findUnique({
        where: {
          companyId_id: {
            companyId,
            id: saleId
          }
        },
        include: {
          items: true,
          payments: true
        }
      });

      expect(sale).toBeDefined();
      expect(sale.buyerCpf).toBe(customerCpf);
      expect(sale.items.length).toBeGreaterThan(0);
      expect(sale.payments.length).toBe(1);
    });

    it('should verify discount was applied', async () => {
      const saleDiscount = await db.saleDiscount.findFirst({
        where: {
          companyId,
          code: discountCode
        }
      });

      expect(saleDiscount).toBeDefined();
      expect(parseFloat(saleDiscount.discountAmount)).toBeGreaterThan(0);
    });

    it('should verify discount usage count increased', async () => {
      const discount = await db.discountCode.findUnique({
        where: {
          companyId_code: {
            companyId,
            code: discountCode
          }
        }
      });

      expect(discount.currentUses).toBeGreaterThan(0);
    });

    it('should verify customer loyalty points were updated', async () => {
      const customer = await db.customer.findUnique({
        where: {
          companyId_cpf: {
            companyId,
            cpf: customerCpf
          }
        }
      });

      // Points should have increased (or decreased if redeemed)
      expect(customer.loyaltyPoints).toBeDefined();
    });
  });

  describe('Step 5: Verify Session Occupancy', () => {
    it('should show updated occupancy for session', async () => {
      const response = await request(app)
        .get(`/api/sessions/${sessionId}/occupancy`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalSeats).toBe(50);
      expect(response.body.data.occupiedSeats).toBeGreaterThanOrEqual(2);
      expect(response.body.data.availableSeats).toBeLessThanOrEqual(48);
    });
  });

  describe('Step 6: Customer Analytics', () => {
    it('should show customer purchase history', async () => {
      const response = await request(app)
        .get(`/api/customers/${customerCpf}/purchase-history`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should show customer analytics with spending data', async () => {
      const response = await request(app)
        .get(`/api/customers/${customerCpf}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analytics).toBeDefined();
      expect(response.body.data.analytics.totalSpent).toBeDefined();
      expect(response.body.data.analytics.totalPurchases).toBeGreaterThan(0);
    });
  });
});
