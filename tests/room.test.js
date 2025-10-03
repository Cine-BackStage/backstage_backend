const request = require('supertest');
const app = require('../src/server');
const { db } = require('../src/database/prisma');

describe('Room Management API', () => {
  let authToken;
  let testCompanyId;
  let testRoomId;
  let testSeatMapId;
  let testEmployeeCpf = '12345678901';

  // Setup: Create test company and employee with authentication
  beforeAll(async () => {
    try {
      // Create test company
      const company = await db.company.create({
        data: {
          name: 'Test Cinema Room Management',
          cnpj: '12345678000199',
          isActive: true,
          subscription: {
            create: {
              plan: 'PREMIUM',
              startDate: new Date(),
              maxEmployees: 100,
              maxRooms: 20,
              monthlyFee: 499.99,
              isActive: true
            }
          }
        }
      });
      testCompanyId = company.id;

      // Create test person
      await db.person.upsert({
        where: { cpf: testEmployeeCpf },
        update: {},
        create: {
          cpf: testEmployeeCpf,
          fullName: 'Test Room Manager',
          email: 'roommanager@test.com',
          phone: '11999999999'
        }
      });

      // Create test employee with MANAGER role
      await db.employee.create({
        data: {
          cpf: testEmployeeCpf,
          companyId: testCompanyId,
          employeeId: 'ROOMTEST001',
          role: 'MANAGER',
          hireDate: new Date(),
          isActive: true,
          passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7TqBdNq4ey' // 'password123'
        }
      });

      // Login to get auth token
      const loginResponse = await request(app)
        .post('/api/employees/login')
        .send({
          cpf: testEmployeeCpf,
          companyId: testCompanyId,
          password: 'password123'
        });

      authToken = loginResponse.body.token;
    } catch (error) {
      console.error('Setup error:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Clean up in reverse order of dependencies
      if (testRoomId) {
        await db.room.deleteMany({
          where: { companyId: testCompanyId }
        });
      }

      if (testSeatMapId) {
        await db.seat.deleteMany({
          where: { seatMapId: testSeatMapId }
        });
        await db.seatMap.deleteMany({
          where: { companyId: testCompanyId }
        });
      }

      // Delete time entries first (foreign key constraint)
      await db.timeEntry.deleteMany({
        where: { companyId: testCompanyId }
      });

      // Delete audit logs
      await db.auditLog.deleteMany({
        where: { companyId: testCompanyId }
      });

      await db.employee.deleteMany({
        where: { companyId: testCompanyId }
      });

      // Delete subscription first (foreign key)
      await db.companySubscription.delete({
        where: { companyId: testCompanyId }
      }).catch(() => {});

      await db.company.delete({
        where: { id: testCompanyId }
      });

      await db.person.delete({
        where: { cpf: testEmployeeCpf }
      }).catch(() => {});

      await db.$disconnect();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  // ===== SEAT MAP TESTS =====

  describe('POST /api/rooms/seat-maps', () => {
    test('should create a new seat map', async () => {
      const seatMapData = {
        name: 'Standard 150-seat layout',
        rows: 10,
        cols: 15,
        layout: {
          aisles: [5],
          disabledSeats: []
        }
      };

      const response = await request(app)
        .post('/api/rooms/seat-maps')
        .set('Authorization', `Bearer ${authToken}`)
        .send(seatMapData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Seat map created successfully'
      });

      expect(response.body.data).toMatchObject({
        name: seatMapData.name,
        rows: seatMapData.rows,
        cols: seatMapData.cols,
        version: 1
      });

      expect(response.body.data).toHaveProperty('id');
      testSeatMapId = response.body.data.id;
    });

    test('should return 400 for invalid seat map data', async () => {
      const invalidData = {
        name: 'Invalid Layout',
        rows: -5, // Invalid negative rows
        cols: 15
      };

      const response = await request(app)
        .post('/api/rooms/seat-maps')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error'
      });
    });

    test('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/rooms/seat-maps')
        .send({
          name: 'Test Layout',
          rows: 10,
          cols: 15
        })
        .expect(401);
    });
  });

  describe('GET /api/rooms/seat-maps/all', () => {
    test('should retrieve all seat maps for company', async () => {
      const response = await request(app)
        .get('/api/rooms/seat-maps/all')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true
      });

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('count');
    });
  });

  describe('GET /api/rooms/seat-maps/:id', () => {
    test('should retrieve specific seat map by ID', async () => {
      const response = await request(app)
        .get(`/api/rooms/seat-maps/${testSeatMapId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true
      });

      expect(response.body.data).toMatchObject({
        id: testSeatMapId,
        name: 'Standard 150-seat layout',
        rows: 10,
        cols: 15
      });
    });

    test('should return 404 for non-existent seat map', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/rooms/seat-maps/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Seat map not found'
      });
    });
  });

  describe('PUT /api/rooms/seat-maps/:id', () => {
    test('should update seat map and increment version', async () => {
      const updateData = {
        name: 'Updated 150-seat layout',
        rows: 12,
        cols: 15
      };

      const response = await request(app)
        .put(`/api/rooms/seat-maps/${testSeatMapId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Seat map updated successfully'
      });

      expect(response.body.data).toMatchObject({
        name: updateData.name,
        rows: updateData.rows,
        cols: updateData.cols,
        version: 2 // Version should increment
      });
    });
  });

  describe('POST /api/rooms/seat-maps/:seatMapId/seats', () => {
    test('should create seats for seat map', async () => {
      const seatsData = {
        seats: [
          { id: 'A1', rowLabel: 'A', number: 1, isAccessible: false, isActive: true },
          { id: 'A2', rowLabel: 'A', number: 2, isAccessible: false, isActive: true },
          { id: 'A3', rowLabel: 'A', number: 3, isAccessible: true, isActive: true },
          { id: 'B1', rowLabel: 'B', number: 1, isAccessible: false, isActive: true },
          { id: 'B2', rowLabel: 'B', number: 2, isAccessible: false, isActive: true }
        ]
      };

      const response = await request(app)
        .post(`/api/rooms/seat-maps/${testSeatMapId}/seats`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(seatsData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true
      });

      expect(response.body.data.created).toBe(5);
    });

    test('should return 404 for non-existent seat map', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const seatsData = {
        seats: [
          { id: 'A1', rowLabel: 'A', number: 1 }
        ]
      };

      const response = await request(app)
        .post(`/api/rooms/seat-maps/${fakeId}/seats`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(seatsData)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Seat map not found'
      });
    });
  });

  // ===== ROOM TESTS =====

  describe('POST /api/rooms', () => {
    test('should create a new room', async () => {
      const roomData = {
        name: 'Theater 1',
        capacity: 150,
        roomType: 'TWO_D',
        seatMapId: testSeatMapId
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(roomData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Room created successfully'
      });

      expect(response.body.data).toMatchObject({
        name: roomData.name,
        capacity: roomData.capacity,
        roomType: roomData.roomType,
        seatMapId: testSeatMapId,
        isActive: true
      });

      expect(response.body.data).toHaveProperty('id');
      testRoomId = response.body.data.id;
    });

    test('should return 409 for duplicate room name', async () => {
      const duplicateRoomData = {
        name: 'Theater 1', // Same name as above
        capacity: 200,
        roomType: 'THREE_D'
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateRoomData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Room with this name already exists'
      });
    });

    test('should return 400 for invalid room type', async () => {
      const invalidData = {
        name: 'Theater Invalid',
        capacity: 100,
        roomType: 'INVALID_TYPE'
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error'
      });
    });

    test('should return 400 for missing required fields', async () => {
      const invalidData = {
        capacity: 100
        // Missing name and roomType
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error'
      });
    });
  });

  describe('GET /api/rooms', () => {
    test('should retrieve all rooms for company', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true
      });

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body).toHaveProperty('count');
    });

    test('should filter rooms by roomType', async () => {
      const response = await request(app)
        .get('/api/rooms?roomType=TWO_D')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);

      if (response.body.data.length > 0) {
        response.body.data.forEach(room => {
          expect(room.roomType).toBe('TWO_D');
        });
      }
    });

    test('should filter rooms by isActive status', async () => {
      const response = await request(app)
        .get('/api/rooms?isActive=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);

      if (response.body.data.length > 0) {
        response.body.data.forEach(room => {
          expect(room.isActive).toBe(true);
        });
      }
    });
  });

  describe('GET /api/rooms/:id', () => {
    test('should retrieve specific room by ID', async () => {
      const response = await request(app)
        .get(`/api/rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true
      });

      expect(response.body.data).toMatchObject({
        id: testRoomId,
        name: 'Theater 1',
        capacity: 150,
        roomType: 'TWO_D',
        isActive: true
      });

      expect(response.body.data).toHaveProperty('seatMap');
    });

    test('should return 404 for non-existent room', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/rooms/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Room not found'
      });
    });
  });

  describe('PUT /api/rooms/:id', () => {
    test('should update room details', async () => {
      const updateData = {
        name: 'Theater 1 - Premium',
        capacity: 180,
        roomType: 'THREE_D'
      };

      const response = await request(app)
        .put(`/api/rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Room updated successfully'
      });

      expect(response.body.data).toMatchObject({
        name: updateData.name,
        capacity: updateData.capacity,
        roomType: updateData.roomType
      });
    });

    test('should return 404 for non-existent room', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/rooms/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Room not found'
      });
    });
  });

  describe('PATCH /api/rooms/:id/activate', () => {
    test('should activate a deactivated room', async () => {
      // First deactivate the room
      await request(app)
        .delete(`/api/rooms/${testRoomId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Then activate it
      const response = await request(app)
        .patch(`/api/rooms/${testRoomId}/activate`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Room activated successfully'
      });

      expect(response.body.data.isActive).toBe(true);
    });
  });

  // ===== ROOM TYPE PRICING TESTS =====

  describe('POST /api/rooms/pricing/room-types', () => {
    test('should set room type price', async () => {
      const priceData = {
        roomType: 'TWO_D',
        price: 25.00
      };

      const response = await request(app)
        .post('/api/rooms/pricing/room-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send(priceData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Room type price set successfully'
      });

      expect(response.body.data).toMatchObject({
        roomType: priceData.roomType,
        price: priceData.price.toString()
      });
    });

    test('should update existing room type price', async () => {
      const updatedPriceData = {
        roomType: 'TWO_D',
        price: 30.00 // Updated price
      };

      const response = await request(app)
        .post('/api/rooms/pricing/room-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedPriceData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true
      });

      expect(response.body.data).toMatchObject({
        roomType: updatedPriceData.roomType,
        price: updatedPriceData.price.toString()
      });
    });

    test('should return 400 for invalid price', async () => {
      const invalidPriceData = {
        roomType: 'TWO_D',
        price: -10 // Negative price
      };

      const response = await request(app)
        .post('/api/rooms/pricing/room-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPriceData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Validation error'
      });
    });
  });

  describe('GET /api/rooms/pricing/room-types', () => {
    test('should retrieve all room type prices', async () => {
      const response = await request(app)
        .get('/api/rooms/pricing/room-types')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true
      });

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);

      const twoDPrice = response.body.data.find(p => p.roomType === 'TWO_D');
      expect(twoDPrice).toBeDefined();
      expect(twoDPrice.price).toBe('30');
    });
  });

  // ===== EDGE CASES AND ERROR HANDLING =====

  describe('Error Handling', () => {
    test('should return 404 when deleting non-existent seat map', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/rooms/seat-maps/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Seat map not found'
      });
    });

    test('should return 404 when creating room with non-existent seat map', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const roomData = {
        name: 'Theater with Invalid Seat Map',
        capacity: 100,
        roomType: 'TWO_D',
        seatMapId: fakeId
      };

      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send(roomData)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        message: 'Seat map not found'
      });
    });
  });
});
