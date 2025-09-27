#!/usr/bin/env node

/**
 * Setup Admin Employee Script
 * Creates an admin employee and generates an access token
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function generateToken(employee) {
  const payload = {
    cpf: employee.cpf,
    employeeId: employee.employeeId,
    role: employee.role,
    permissions: employee.permissions || {}
  };

  return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h'
  });
}

async function createAdminEmployee() {
  console.log('🎬 Cinema Management System - Admin Setup\n');

  try {
    // Get admin details
    const cpf = await question('Enter CPF (11 digits) [12345678901]: ') || '12345678901';
    const fullName = await question('Enter full name [System Administrator]: ') || 'System Administrator';
    const email = await question('Enter email [admin@cinema.com]: ') || 'admin@cinema.com';
    const phone = await question('Enter phone [11999999999]: ') || '11999999999';
    const employeeId = await question('Enter employee ID [ADMIN001]: ') || 'ADMIN001';
    const password = await question('Enter password [admin123]: ') || 'admin123';

    console.log('\n🔄 Creating admin employee...\n');

    // Check if employee already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { cpf }
    });

    if (existingEmployee) {
      console.log('⚠️  Employee with this CPF already exists!');
      const overwrite = await question('Do you want to delete and recreate? (y/N): ');

      if (overwrite.toLowerCase() === 'y') {
        // Clean up existing records
        await prisma.auditLog.deleteMany({ where: { actorCpf: cpf } });
        await prisma.timeEntry.deleteMany({ where: { employeeCpf: cpf } });
        await prisma.employee.delete({ where: { cpf } });
        await prisma.person.deleteMany({ where: { cpf } });
        console.log('🗑️  Existing records cleaned up');
      } else {
        console.log('❌ Setup cancelled');
        process.exit(0);
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create person record
    const person = await prisma.person.create({
      data: {
        cpf,
        fullName,
        email,
        phone
      }
    });

    // Create admin employee
    const employee = await prisma.employee.create({
      data: {
        cpf,
        employeeId,
        role: 'ADMIN',
        hireDate: new Date(),
        passwordHash,
        permissions: {
          all: true,
          employees: true,
          sales: true,
          inventory: true,
          reports: true,
          system: true
        }
      }
    });

    // Generate access token
    const token = await generateToken(employee);

    console.log('✅ Admin employee created successfully!\n');
    console.log('📋 Employee Details:');
    console.log('   CPF:', cpf);
    console.log('   Full Name:', fullName);
    console.log('   Email:', email);
    console.log('   Employee ID:', employeeId);
    console.log('   Role: ADMIN');
    console.log('   Password:', password);
    console.log('\n🔑 Access Token (valid for 8 hours):');
    console.log('   ' + token);

    console.log('\n📖 Usage Examples:');
    console.log('   # Set token as environment variable:');
    console.log(`   export TOKEN="${token}"`);
    console.log('\n   # Test authentication:');
    console.log('   curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/employees/me');
    console.log('\n   # Create new employee:');
    console.log('   curl -X POST http://localhost:3000/api/employees \\');
    console.log('     -H "Authorization: Bearer $TOKEN" \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"cpf":"98765432100","fullName":"John Doe","email":"john@cinema.com","employeeId":"EMP001","role":"CASHIER","password":"password123"}\'');

    // Save token to file for easy access
    const fs = require('fs');
    const tokenData = {
      employee: {
        cpf,
        employeeId,
        fullName,
        email,
        role: 'ADMIN'
      },
      token,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    };

    fs.writeFileSync('.admin-token.json', JSON.stringify(tokenData, null, 2));
    console.log('\n💾 Token saved to .admin-token.json');

  } catch (error) {
    console.error('❌ Error creating admin employee:', error.message);

    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('email')) {
        console.error('   → Email already exists in the system');
      } else if (error.meta?.target?.includes('employee_id')) {
        console.error('   → Employee ID already exists in the system');
      }
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n\n👋 Setup cancelled by user');
  await prisma.$disconnect();
  rl.close();
  process.exit(0);
});

// Run the setup
if (require.main === module) {
  createAdminEmployee();
}

module.exports = { createAdminEmployee };