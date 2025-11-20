// Test helper functions
const { db } = require('../../src/database/prisma');
const { AuthService } = require('../../src/middleware/auth-multitenant');

/**
 * Create a test company with subscription
 */
async function createTestCompany(cnpj, name = 'Test Company') {
  const company = await db.company.create({
    data: {
      name,
      cnpj,
      tradeName: name,
      email: `${cnpj}@test.com`,
      phone: '1234567890',
      isActive: true,
      subscription: {
        create: {
          plan: 'BASIC',
          startDate: new Date(),
          maxEmployees: 50,
          maxRooms: 10,
          isActive: true,
          monthlyFee: 99.90
        }
      }
    },
    include: {
      subscription: true
    }
  });

  return company;
}

/**
 * Create a test employee with person
 */
async function createTestEmployee(cpf, companyId, role = 'ADMIN', employeeIdPrefix = 'TEST') {
  const person = await db.person.create({
    data: {
      cpf,
      fullName: `Test ${role}`,
      email: `${cpf}@test.com`,
      phone: '1234567890'
    }
  });

  const employee = await db.employee.create({
    data: {
      cpf: person.cpf,
      companyId,
      employeeId: `${employeeIdPrefix}-${Date.now() % 100000}`.substring(0, 20), // Limit to 20 chars
      role,
      hireDate: new Date(),
      passwordHash: await AuthService.hashPassword('password123'),
      isActive: true
    }
  });

  return { person, employee };
}

/**
 * Clean up test data
 */
async function cleanupTestData(companyId, cpfs = []) {
  if (companyId) {
    try {
      await db.employee.deleteMany({ where: { companyId } });
      await db.companySubscription.delete({ where: { companyId } });
      await db.company.delete({ where: { id: companyId } });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  for (const cpf of cpfs) {
    try {
      await db.person.delete({ where: { cpf } });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

module.exports = {
  createTestCompany,
  createTestEmployee,
  cleanupTestData
};
