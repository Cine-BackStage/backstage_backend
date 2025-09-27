#!/usr/bin/env node

/**
 * Get Access Token Script
 * Login with existing employee credentials to get a fresh access token
 */

const axios = require('axios');
const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function getAccessToken() {
  console.log('🔑 Cinema Management System - Get Access Token\n');

  try {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';

    // Get credentials
    const employeeId = await question('Enter Employee ID [ADMIN001]: ') || 'ADMIN001';
    const password = await question('Enter Password [admin123]: ') || 'admin123';

    console.log('\n🔄 Authenticating...\n');

    // Make login request
    const response = await axios.post(`${apiUrl}/api/employees/login`, {
      employeeId,
      password
    });

    if (response.data.success) {
      const { token, employee } = response.data.data;

      console.log('✅ Authentication successful!\n');
      console.log('👤 Employee Details:');
      console.log('   CPF:', employee.cpf);
      console.log('   Employee ID:', employee.employeeId);
      console.log('   Full Name:', employee.fullName);
      console.log('   Role:', employee.role);
      console.log('   Email:', employee.email);

      console.log('\n🔑 Access Token (valid for 8 hours):');
      console.log('   ' + token);

      console.log('\n📖 Usage Examples:');
      console.log('   # Set token as environment variable:');
      console.log(`   export TOKEN="${token}"`);
      console.log('\n   # Test authentication:');
      console.log('   curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/employees/me');

      // Save token to file
      const tokenData = {
        employee: {
          cpf: employee.cpf,
          employeeId: employee.employeeId,
          fullName: employee.fullName,
          email: employee.email,
          role: employee.role
        },
        token,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      };

      fs.writeFileSync('.current-token.json', JSON.stringify(tokenData, null, 2));
      console.log('\n💾 Token saved to .current-token.json');

    } else {
      console.error('❌ Authentication failed:', response.data.message);
      process.exit(1);
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ Authentication failed:', error.response.data.message);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to API. Is the server running?');
      console.error('   Make sure Docker containers are up: docker-compose up -d');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle script termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Cancelled by user');
  rl.close();
  process.exit(0);
});

// Run the script
if (require.main === module) {
  getAccessToken();
}

module.exports = { getAccessToken };