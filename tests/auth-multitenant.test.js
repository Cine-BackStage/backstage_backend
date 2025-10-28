const { AuthService } = require('../src/middleware/auth-multitenant');
const { db } = require('../src/database/prisma');
const bcrypt = require('bcryptjs');

describe('AuthService', () => {
  let companyId;
  let employeeCpf = '77766655544';

  beforeAll(async () => {
    // Create test company
    const company = await db.company.create({
      data: {
        name: 'Test Auth Company',
        cnpj: '77766655000188',
        isActive: true,
        subscription: {
          create: {
            plan: 'BASIC',
            startDate: new Date(),
            maxEmployees: 10,
            maxRooms: 5,
            monthlyFee: 99.99,
            isActive: true
          }
        }
      }
    });
    companyId = company.id;

    // Create test person
    await db.person.create({
      data: {
        cpf: employeeCpf,
        fullName: 'Test Auth Employee',
        email: 'authtest@test.com',
        phone: '11999999996'
      }
    });

    // Create test employee
    await db.employee.create({
      data: {
        cpf: employeeCpf,
        companyId,
        employeeId: 'AUTH001',
        role: 'MANAGER',
        hireDate: new Date(),
        isActive: true,
        passwordHash: await bcrypt.hash('testpassword', 12),
        permissions: { all: true }
      }
    });
  });

  afterAll(async () => {
    await db.employee.deleteMany({ where: { companyId } });
    await db.timeEntry.deleteMany({ where: { companyId } });
    await db.auditLog.deleteMany({ where: { companyId } });
    await db.companySubscription.delete({ where: { companyId } }).catch(() => {});
    await db.company.delete({ where: { id: companyId } });
    await db.person.delete({ where: { cpf: employeeCpf } });
    await db.$disconnect();
  });

  describe('generateToken', () => {
    test('should generate valid JWT token', () => {
      const employee = {
        cpf: employeeCpf,
        companyId,
        employeeId: 'AUTH001',
        role: 'MANAGER',
        permissions: { all: true },
        company: { name: 'Test Company' }
      };

      const token = AuthService.generateToken(employee);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('should include all required fields in token payload', () => {
      const employee = {
        cpf: employeeCpf,
        companyId,
        employeeId: 'AUTH001',
        role: 'MANAGER',
        permissions: { all: true },
        company: { name: 'Test Company' }
      };

      const token = AuthService.generateToken(employee);
      const decoded = AuthService.verifyToken(token);

      expect(decoded.cpf).toBe(employeeCpf);
      expect(decoded.companyId).toBe(companyId);
      expect(decoded.employeeId).toBe('AUTH001');
      expect(decoded.role).toBe('MANAGER');
    });

    test('should handle employee without company object', () => {
      const employee = {
        cpf: employeeCpf,
        companyId,
        employeeId: 'AUTH001',
        role: 'MANAGER'
      };

      const token = AuthService.generateToken(employee);
      expect(token).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    test('should verify valid token', () => {
      const employee = {
        cpf: employeeCpf,
        companyId,
        employeeId: 'AUTH001',
        role: 'MANAGER'
      };

      const token = AuthService.generateToken(employee);
      const decoded = AuthService.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.cpf).toBe(employeeCpf);
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        AuthService.verifyToken('invalid.token.here');
      }).toThrow('Invalid token');
    });

    test('should throw error for malformed token', () => {
      expect(() => {
        AuthService.verifyToken('not-a-token');
      }).toThrow('Invalid token');
    });
  });

  describe('hashPassword', () => {
    test('should hash password', async () => {
      const password = 'testpassword123';
      const hash = await AuthService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2') || hash.startsWith('$2a') || hash.startsWith('$2b')).toBe(true);
    });

    test('should generate different hashes for same password', async () => {
      const password = 'testpassword123';
      const hash1 = await AuthService.hashPassword(password);
      const hash2 = await AuthService.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
    });
  });

  describe('comparePassword', () => {
    test('should return true for matching password', async () => {
      const password = 'testpassword123';
      const hash = await AuthService.hashPassword(password);
      const isMatch = await AuthService.comparePassword(password, hash);

      expect(isMatch).toBe(true);
    });

    test('should return false for non-matching password', async () => {
      const password = 'testpassword123';
      const hash = await AuthService.hashPassword(password);
      const isMatch = await AuthService.comparePassword('wrongpassword', hash);

      expect(isMatch).toBe(false);
    });

    test('should handle empty password', async () => {
      const hash = await AuthService.hashPassword('test');
      const isMatch = await AuthService.comparePassword('', hash);

      expect(isMatch).toBe(false);
    });
  });

  describe('validateCompanyAccess', () => {
    test('should validate active company with active subscription', async () => {
      const company = await AuthService.validateCompanyAccess(companyId);

      expect(company).toBeDefined();
      expect(company.id).toBe(companyId);
      expect(company.isActive).toBe(true);
      expect(company.subscription).toBeDefined();
      expect(company.subscription.isActive).toBe(true);
    });

    test('should throw error for non-existent company', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      await expect(AuthService.validateCompanyAccess(fakeId))
        .rejects.toThrow('Company not found or inactive');
    });

    test('should throw error for inactive company', async () => {
      // Create inactive company
      const inactiveCompany = await db.company.create({
        data: {
          name: 'Inactive Company',
          cnpj: '99999999000199',
          isActive: false
        }
      });

      await expect(AuthService.validateCompanyAccess(inactiveCompany.id))
        .rejects.toThrow('Company not found or inactive');

      // Cleanup
      await db.company.delete({ where: { id: inactiveCompany.id } });
    });

    test('should throw error for inactive subscription', async () => {
      // Create company with inactive subscription
      const testCompany = await db.company.create({
        data: {
          name: 'Inactive Subscription Company',
          cnpj: '88888888000188',
          isActive: true,
          subscription: {
            create: {
              plan: 'BASIC',
              startDate: new Date(),
              maxEmployees: 10,
              maxRooms: 5,
              monthlyFee: 99.99,
              isActive: false
            }
          }
        }
      });

      await expect(AuthService.validateCompanyAccess(testCompany.id))
        .rejects.toThrow('Company subscription is inactive');

      // Cleanup
      await db.companySubscription.delete({ where: { companyId: testCompany.id } });
      await db.company.delete({ where: { id: testCompany.id } });
    });

    test('should throw error for expired subscription', async () => {
      // Create company with expired subscription
      const testCompany = await db.company.create({
        data: {
          name: 'Expired Subscription Company',
          cnpj: '77777777000177',
          isActive: true,
          subscription: {
            create: {
              plan: 'BASIC',
              startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
              endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Expired yesterday
              maxEmployees: 10,
              maxRooms: 5,
              monthlyFee: 99.99,
              isActive: true
            }
          }
        }
      });

      await expect(AuthService.validateCompanyAccess(testCompany.id))
        .rejects.toThrow('Company subscription has expired');

      // Cleanup
      await db.companySubscription.delete({ where: { companyId: testCompany.id } });
      await db.company.delete({ where: { id: testCompany.id } });
    });

    test('should validate company without endDate', async () => {
      // This should pass since no endDate means no expiration
      const company = await AuthService.validateCompanyAccess(companyId);
      expect(company).toBeDefined();
    });
  });
});
