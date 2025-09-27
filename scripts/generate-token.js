#!/usr/bin/env node

/**
 * Generate Bearer JWT Token Script
 * Generates a JWT token for the existing admin employee and outputs it for copy-paste
 */

const jwt = require('jsonwebtoken');

function generateToken() {
  const employee = {
    cpf: '12345678901',
    employeeId: 'ADMIN001',
    role: 'ADMIN',
    permissions: { all: true }
  };

  // Use the JWT_SECRET from environment, fallback to 'fallback-secret'
  const secret = process.env.JWT_SECRET || 'fallback-secret';
  const expiresIn = process.env.JWT_EXPIRES_IN || '8h';

  const token = jwt.sign(employee, secret, { expiresIn });

  // Verify the token works
  try {
    const decoded = jwt.verify(token, secret);
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - now;
    const hoursUntilExpiry = Math.floor(timeUntilExpiry / 3600);
    const minutesUntilExpiry = Math.floor((timeUntilExpiry % 3600) / 60);

    // Clean output - just the token for easy copy-paste
    console.log(`Bearer ${token}`);

    // Optional: Add metadata to stderr so it doesn't interfere with copy-paste
    if (process.env.VERBOSE) {
      console.error('');
      console.error('🎯 Token Details:');
      console.error(`   Employee: ${employee.employeeId} (${employee.role})`);
      console.error(`   Valid for: ${hoursUntilExpiry}h ${minutesUntilExpiry}m`);
      console.error('');
      console.error('📋 Usage:');
      console.error('   1. Copy the token above');
      console.error('   2. Go to http://localhost:3000/api/docs');
      console.error('   3. Click 🔒 Authorize button');
      console.error('   4. Paste the complete token');
      console.error('   5. Click Authorize');
    }

  } catch (error) {
    console.error('❌ Token generation failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node generate-token.js [options]');
  console.log('');
  console.log('Generate a Bearer JWT token for API authentication');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h     Show this help message');
  console.log('  --verbose, -v  Show additional token information');
  console.log('');
  console.log('Examples:');
  console.log('  node generate-token.js                    # Generate token (clean output)');
  console.log('  VERBOSE=true node generate-token.js       # Generate with details');
  console.log('  node generate-token.js --verbose          # Generate with details');
  console.log('');
  console.log('Docker usage:');
  console.log('  docker-compose exec api npm run token     # Clean token output');
  console.log('  docker-compose exec api npm run token:verbose  # With details');
  process.exit(0);
}

if (process.argv.includes('--verbose') || process.argv.includes('-v')) {
  process.env.VERBOSE = 'true';
}

// Generate the token
generateToken();