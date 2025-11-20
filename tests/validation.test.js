const {
  validateSession,
  validateTicket,
  validateBulkTicket,
  validateSale,
  validateSaleItem,
  validatePayment,
  validateCustomer,
  validateEmployee,
  validateInventoryItem,
  validateMovie,
  validateRoom,
  validateDiscountCode
} = require('../src/utils/validation');

describe('Validation Utils', () => {
  describe('validateSession', () => {
    test('should validate valid session data', () => {
      const data = {
        movie_id: 1,
        room_id: 2,
        start_time: '2025-12-01T14:00:00Z',
        end_time: '2025-12-01T16:00:00Z',
        status: 'SCHEDULED'
      };
      const { error } = validateSession(data);
      expect(error).toBeUndefined();
    });

    test('should reject missing required fields', () => {
      const { error } = validateSession({});
      expect(error).toBeDefined();
    });

    test('should reject invalid status', () => {
      const data = {
        movie_id: 1,
        room_id: 2,
        start_time: '2025-12-01T14:00:00Z',
        end_time: '2025-12-01T16:00:00Z',
        status: 'INVALID'
      };
      const { error } = validateSession(data);
      expect(error).toBeDefined();
    });

    test('should reject end_time before start_time', () => {
      const data = {
        movie_id: 1,
        room_id: 2,
        start_time: '2025-12-01T16:00:00Z',
        end_time: '2025-12-01T14:00:00Z'
      };
      const { error } = validateSession(data);
      expect(error).toBeDefined();
    });

    test('should allow partial validation', () => {
      const data = {
        movie_id: 1
      };
      const { error } = validateSession(data, true);
      expect(error).toBeUndefined();
    });
  });

  describe('validateTicket', () => {
    test('should validate valid ticket data', () => {
      const data = {
        session_id: 1,
        seat_id: 'A1',
        price: 25.50
      };
      const { error } = validateTicket(data);
      expect(error).toBeUndefined();
    });

    test('should reject missing session_id', () => {
      const data = {
        seat_id: 'A1'
      };
      const { error } = validateTicket(data);
      expect(error).toBeDefined();
    });

    test('should reject invalid seat_id length', () => {
      const data = {
        session_id: 1,
        seat_id: 'A'.repeat(11)
      };
      const { error } = validateTicket(data);
      expect(error).toBeDefined();
    });

    test('should reject negative price', () => {
      const data = {
        session_id: 1,
        seat_id: 'A1',
        price: -10
      };
      const { error } = validateTicket(data);
      expect(error).toBeDefined();
    });
  });

  describe('validateBulkTicket', () => {
    test('should validate valid bulk ticket data', () => {
      const data = {
        session_id: 1,
        seat_ids: ['A1', 'A2', 'A3'],
        price: 25.50
      };
      const { error } = validateBulkTicket(data);
      expect(error).toBeUndefined();
    });

    test('should reject empty seat_ids array', () => {
      const data = {
        session_id: 1,
        seat_ids: []
      };
      const { error } = validateBulkTicket(data);
      expect(error).toBeDefined();
    });

    test('should reject more than 50 seats', () => {
      const data = {
        session_id: 1,
        seat_ids: Array(51).fill('A1')
      };
      const { error } = validateBulkTicket(data);
      expect(error).toBeDefined();
    });
  });

  describe('validateSale', () => {
    test('should validate valid sale data', () => {
      const data = {
        buyer_cpf: '12345678901',
        cashier_cpf: '10987654321'
      };
      const { error } = validateSale(data);
      expect(error).toBeUndefined();
    });

    test('should allow optional buyer_cpf', () => {
      const data = {
        cashier_cpf: '10987654321'
      };
      const { error } = validateSale(data);
      expect(error).toBeUndefined();
    });

    test('should reject invalid CPF length', () => {
      const data = {
        cashier_cpf: '123456'
      };
      const { error } = validateSale(data);
      expect(error).toBeDefined();
    });

    test('should reject non-numeric CPF', () => {
      const data = {
        cashier_cpf: '1234567890a'
      };
      const { error } = validateSale(data);
      expect(error).toBeDefined();
    });
  });

  describe('validateSaleItem', () => {
    test('should validate valid sale item data', () => {
      const data = {
        description: 'Test Item',
        quantity: 2,
        unit_price: 10.50
      };
      const { error } = validateSaleItem(data);
      expect(error).toBeUndefined();
    });

    test('should reject missing required fields', () => {
      const { error } = validateSaleItem({});
      expect(error).toBeDefined();
    });

    test('should reject negative quantity', () => {
      const data = {
        description: 'Test',
        quantity: -1,
        unit_price: 10
      };
      const { error } = validateSaleItem(data);
      expect(error).toBeDefined();
    });

    test('should accept optional SKU', () => {
      const data = {
        description: 'Test',
        sku: 'SKU123',
        quantity: 1,
        unit_price: 10
      };
      const { error } = validateSaleItem(data);
      expect(error).toBeUndefined();
    });
  });

  describe('validatePayment', () => {
    test('should validate valid payment data', () => {
      const data = {
        payments: [
          { method: 'CASH', amount: 50.00 },
          { method: 'CARD', amount: 30.00, auth_code: 'AUTH123' }
        ]
      };
      const { error } = validatePayment(data);
      expect(error).toBeUndefined();
    });

    test('should reject empty payments array', () => {
      const data = {
        payments: []
      };
      const { error } = validatePayment(data);
      expect(error).toBeDefined();
    });

    test('should reject invalid payment method', () => {
      const data = {
        payments: [
          { method: 'INVALID', amount: 50.00 }
        ]
      };
      const { error } = validatePayment(data);
      expect(error).toBeDefined();
    });

    test('should reject negative amount', () => {
      const data = {
        payments: [
          { method: 'CASH', amount: -50.00 }
        ]
      };
      const { error } = validatePayment(data);
      expect(error).toBeDefined();
    });
  });

  describe('validateCustomer', () => {
    test('should validate valid customer data', () => {
      const data = {
        cpf: '12345678901',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '11999999999',
        birth_date: '1990-01-01T00:00:00Z'
      };
      const { error } = validateCustomer(data);
      expect(error).toBeUndefined();
    });

    test('should reject invalid email', () => {
      const data = {
        cpf: '12345678901',
        full_name: 'John Doe',
        email: 'invalid-email'
      };
      const { error } = validateCustomer(data);
      expect(error).toBeDefined();
    });

    test('should allow optional fields', () => {
      const data = {
        cpf: '12345678901',
        full_name: 'John Doe',
        email: 'john@example.com'
      };
      const { error } = validateCustomer(data);
      expect(error).toBeUndefined();
    });
  });

  describe('validateEmployee', () => {
    test('should validate valid employee data', () => {
      const data = {
        cpf: '12345678901',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        employee_id: 'EMP001',
        role: 'CASHIER',
        hire_date: '2023-01-01T00:00:00Z',
        is_active: true
      };
      const { error } = validateEmployee(data);
      expect(error).toBeUndefined();
    });

    test('should reject missing required fields', () => {
      const { error } = validateEmployee({});
      expect(error).toBeDefined();
    });
  });

  describe('validateInventoryItem', () => {
    test('should validate valid inventory item', () => {
      const data = {
        sku: 'SKU123',
        name: 'Popcorn',
        unit_price: 10.50,
        qty_on_hand: 100,
        reorder_level: 20,
        barcode: '1234567890',
        item_type: 'food',
        expiry_date: '2025-12-31T00:00:00Z',
        is_combo: false
      };
      const { error } = validateInventoryItem(data);
      expect(error).toBeUndefined();
    });

    test('should validate collectable item', () => {
      const data = {
        sku: 'COLL001',
        name: 'Movie Poster',
        unit_price: 25.00,
        item_type: 'collectable',
        category: 'Posters',
        brand: 'StudioX'
      };
      const { error } = validateInventoryItem(data);
      expect(error).toBeUndefined();
    });

    test('should reject negative quantity', () => {
      const data = {
        sku: 'SKU123',
        name: 'Test',
        unit_price: 10,
        qty_on_hand: -5
      };
      const { error } = validateInventoryItem(data);
      expect(error).toBeDefined();
    });
  });

  describe('validateMovie', () => {
    test('should validate valid movie data', () => {
      const data = {
        title: 'Test Movie',
        duration_min: 120,
        genre: 'Action',
        description: 'A great movie',
        rating: '12',
        poster_url: 'https://example.com/poster.jpg',
        is_active: true
      };
      const { error } = validateMovie(data);
      expect(error).toBeUndefined();
    });

    test('should reject invalid rating', () => {
      const data = {
        title: 'Test Movie',
        duration_min: 120,
        rating: 'INVALID'
      };
      const { error } = validateMovie(data);
      expect(error).toBeDefined();
    });

    test('should reject invalid poster URL', () => {
      const data = {
        title: 'Test Movie',
        duration_min: 120,
        poster_url: 'not-a-url'
      };
      const { error } = validateMovie(data);
      expect(error).toBeDefined();
    });

    test('should allow partial validation', () => {
      const data = {
        title: 'Test Movie'
      };
      const { error } = validateMovie(data, true);
      expect(error).toBeUndefined();
    });

    test('should validate all rating values', () => {
      const ratings = ['L', '10', '12', '14', '16', '18']; // Brazilian ratings
      ratings.forEach(rating => {
        const data = {
          title: 'Test',
          duration_min: 120,
          rating
        };
        const { error } = validateMovie(data);
        expect(error).toBeUndefined();
      });
    });
  });

  describe('validateRoom', () => {
    test('should validate valid room data', () => {
      const data = {
        name: 'Room 1',
        capacity: 100,
        room_type: 'TWO_D',
        seatmap_id: 1
      };
      const { error } = validateRoom(data);
      expect(error).toBeUndefined();
    });

    test('should reject invalid room type', () => {
      const data = {
        name: 'Room 1',
        capacity: 100,
        room_type: 'INVALID',
        seatmap_id: 1
      };
      const { error } = validateRoom(data);
      expect(error).toBeDefined();
    });

    test('should validate all room types', () => {
      const types = ['TWO_D', 'THREE_D', 'EXTREME'];
      types.forEach(room_type => {
        const data = {
          name: 'Room 1',
          capacity: 100,
          room_type,
          seatmap_id: 1
        };
        const { error } = validateRoom(data);
        expect(error).toBeUndefined();
      });
    });

    test('should allow partial validation', () => {
      const data = {
        name: 'Room 1'
      };
      const { error } = validateRoom(data, true);
      expect(error).toBeUndefined();
    });
  });

  describe('validateDiscountCode', () => {
    test('should validate valid discount code', () => {
      const data = {
        code: 'SAVE10',
        description: '10% off',
        type: 'PERCENT',
        value: 10.00,
        valid_from: '2025-01-01T00:00:00Z',
        valid_to: '2025-12-31T23:59:59Z',
        cpf_range_start: '00000000000',
        cpf_range_end: '99999999999'
      };
      const { error } = validateDiscountCode(data);
      expect(error).toBeUndefined();
    });

    test('should reject valid_to before valid_from', () => {
      const data = {
        code: 'SAVE10',
        type: 'PERCENT',
        value: 10,
        valid_from: '2025-12-31T00:00:00Z',
        valid_to: '2025-01-01T00:00:00Z'
      };
      const { error } = validateDiscountCode(data);
      expect(error).toBeDefined();
    });

    test('should validate AMOUNT discount type', () => {
      const data = {
        code: 'SAVE5',
        type: 'AMOUNT',
        value: 5.00,
        valid_from: '2025-01-01T00:00:00Z',
        valid_to: '2025-12-31T23:59:59Z'
      };
      const { error } = validateDiscountCode(data);
      expect(error).toBeUndefined();
    });

    test('should reject invalid discount type', () => {
      const data = {
        code: 'SAVE10',
        type: 'INVALID',
        value: 10,
        valid_from: '2025-01-01T00:00:00Z',
        valid_to: '2025-12-31T00:00:00Z'
      };
      const { error } = validateDiscountCode(data);
      expect(error).toBeDefined();
    });

    test('should allow partial validation', () => {
      const data = {
        code: 'SAVE10'
      };
      const { error } = validateDiscountCode(data, true);
      expect(error).toBeUndefined();
    });

    test('should reject invalid CPF format', () => {
      const data = {
        code: 'SAVE10',
        type: 'PERCENT',
        value: 10,
        valid_from: '2025-01-01T00:00:00Z',
        valid_to: '2025-12-31T00:00:00Z',
        cpf_range_start: '123'
      };
      const { error } = validateDiscountCode(data);
      expect(error).toBeDefined();
    });
  });
});
