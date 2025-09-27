#!/usr/bin/env node

/**
 * System Admin Token Generator
 * Generates JWT tokens for system administrators (cross-tenant access)
 */

const jwt = require('jsonwebtoken');
const { db } = require('../src/database/prisma');

class SystemAdminAuth {
  /**
   * Generate JWT token for system admin
   * @param {Object} admin - System admin object
   * @returns {string} JWT token
   */
  static generateToken(admin) {
    const payload = {
      adminId: admin.id,
      username: admin.username,
      email: admin.email,
      type: 'system_admin', // Distinguish from employee tokens
      permissions: ['all_companies', 'system_management']
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h'
    });
  }

  /**
   * Verify system admin token
   * @param {string} token - JWT token
   * @returns {Object} Decoded token payload
   */
  static verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');

      if (decoded.type !== 'system_admin') {
        throw new Error('Not a system admin token');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid system admin token');
    }
  }
}

async function generateSystemAdminToken(username) {
  try {
    // Find the system admin
    const admin = await db.systemAdmin.findFirst({
      where: {
        username: username,
        isActive: true
      }
    });

    if (!admin) {
      console.error(`❌ System admin '${username}' not found or inactive`);
      process.exit(1);
    }

    // Generate system admin token
    const token = SystemAdminAuth.generateToken(admin);

    // Clean output for easy copy-paste
    console.log(`Bearer ${token}`);

    // Optional: Add metadata to stderr so it doesn't interfere with copy-paste
    if (process.env.VERBOSE || process.argv.includes('--verbose')) {
      console.error('');
      console.error('👑 System Admin Token Details:');
      console.error(`   Username: ${admin.username}`);
      console.error(`   Email: ${admin.email}`);
      console.error(`   Permissions: Cross-tenant access to all companies`);
      console.error(`   Admin ID: ${admin.id}`);
      console.error('');
      console.error('📋 Usage in Swagger:');
      console.error('   1. Copy the token above (with "Bearer " prefix)');
      console.error('   2. Go to http://localhost:3000/api/docs');
      console.error('   3. Click 🔒 Authorize button');
      console.error('   4. Paste the complete token');
      console.error('   5. You now have access to ALL company data');
      console.error('');
      console.error('📋 Usage for API calls (remove "Bearer " for Swagger input field):');
      console.error(`   ${token}`);
      console.error('');
      console.error('⚠️  SECURITY NOTE:');
      console.error('   This token provides access to ALL companies and system data.');
      console.error('   Use responsibly and only for administrative purposes.');
    }

  } catch (error) {
    console.error('❌ System admin token generation failed:', error.message);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Handle command line execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 1 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node generate-sysadmin-token.js <username> [options]');
    console.log('');
    console.log('Generate a Bearer JWT token for system administrator');
    console.log('');
    console.log('Arguments:');
    console.log('  username     System admin username');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('  --verbose, -v  Show additional token information');
    console.log('');
    console.log('Examples:');
    console.log('  # Generate token for default sysadmin');
    console.log('  node generate-sysadmin-token.js sysadmin');
    console.log('');
    console.log('  # Generate with details');
    console.log('  node generate-sysadmin-token.js sysadmin --verbose');
    console.log('');
    console.log('Docker usage:');
    console.log('  docker-compose exec api node scripts/generate-sysadmin-token.js sysadmin');
    console.log('');
    console.log('Default System Admin (after seeding):');
    console.log('  Username: sysadmin');
    console.log('  Password: sysadmin123');
    console.log('  Email: admin@cinema-system.com');
    console.log('');
    console.log('🔐 System Admin Capabilities:');
    console.log('  • View all companies and their data');
    console.log('  • Manage company subscriptions');
    console.log('  • Cross-tenant reporting and analytics');
    console.log('  • System-wide user management');
    console.log('  • Platform administration');

    process.exit(0);
  }

  const [username] = args;

  if (args.includes('--verbose') || args.includes('-v')) {
    process.env.VERBOSE = 'true';
  }

  generateSystemAdminToken(username);
}

module.exports = { SystemAdminAuth, generateSystemAdminToken };