#!/usr/bin/env node

/**
 * Multi-Tenant Token Generator
 * Generates JWT tokens for employees in specific companies
 */

const { AuthService } = require('../src/middleware/auth-multitenant');
const { db } = require('../src/database/prisma');

async function generateMultiTenantToken(companyId, employeeId) {
  try {
    // Find the employee in the specified company
    const employee = await db.employee.findFirst({
      where: {
        companyId: companyId,
        employeeId: employeeId,
        isActive: true
      },
      include: {
        person: true,
        company: true
      }
    });

    if (!employee) {
      console.error(`❌ Employee ${employeeId} not found in company ${companyId}`);
      process.exit(1);
    }

    // Generate token with company context
    const token = AuthService.generateToken(employee);

    // Clean output for easy copy-paste
    console.log(`Bearer ${token}`);

    // Optional: Add metadata to stderr so it doesn't interfere with copy-paste
    if (process.env.VERBOSE || process.argv.includes('--verbose')) {
      console.error('');
      console.error('🎯 Token Details:');
      console.error(`   Company: ${employee.company.name} (${employee.company.tradeName})`);
      console.error(`   Employee: ${employee.employeeId} - ${employee.person.fullName}`);
      console.error(`   Role: ${employee.role}`);
      console.error(`   Company ID: ${employee.companyId}`);
      console.error('');
      console.error('📋 Usage in Swagger:');
      console.error('   1. Copy the token above (with "Bearer " prefix)');
      console.error('   2. Go to http://localhost:3000/api/docs');
      console.error('   3. Click 🔒 Authorize button');
      console.error('   4. Paste the complete token');
      console.error('   5. Click Authorize');
      console.error('');
      console.error('📋 Usage for API calls (remove "Bearer " for Swagger input field):');
      const tokenOnly = token;
      console.error(`   ${tokenOnly}`);
    }

  } catch (error) {
    console.error('❌ Token generation failed:', error.message);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Handle command line execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node generate-token-multitenant.js <companyId> <employeeId> [options]');
    console.log('');
    console.log('Generate a Bearer JWT token for a specific employee in a company');
    console.log('');
    console.log('Arguments:');
    console.log('  companyId    Company UUID');
    console.log('  employeeId   Employee ID within the company');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('  --verbose, -v  Show additional token information');
    console.log('');
    console.log('Examples:');
    console.log('  # Generate token for CineMax admin');
    console.log('  node generate-token-multitenant.js 11111111-1111-1111-1111-111111111111 ADM001');
    console.log('');
    console.log('  # Generate with details');
    console.log('  node generate-token-multitenant.js 22222222-2222-2222-2222-222222222222 MGR002 --verbose');
    console.log('');
    console.log('Docker usage:');
    console.log('  docker-compose exec api node scripts/generate-token-multitenant.js <companyId> <employeeId>');
    console.log('');
    console.log('Available Companies (after seeding):');
    console.log('  CineMax:        11111111-1111-1111-1111-111111111111');
    console.log('  MovieTime:      22222222-2222-2222-2222-222222222222');
    console.log('  Premium Screens: 33333333-3333-3333-3333-333333333333');
    console.log('');
    console.log('Employee IDs:');
    console.log('  ADM001, ADM002, ADM003  (Admins for companies 1, 2, 3)');
    console.log('  MGR001, MGR002, MGR003  (Managers)');
    console.log('  CSH001, CSH002, CSH003  (Cashiers)');

    process.exit(0);
  }

  const [companyId, employeeId] = args;

  if (args.includes('--verbose') || args.includes('-v')) {
    process.env.VERBOSE = 'true';
  }

  generateMultiTenantToken(companyId, employeeId);
}

module.exports = { generateMultiTenantToken };