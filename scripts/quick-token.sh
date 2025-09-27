#!/bin/bash

# Quick Token Generator for Swagger Testing
# This script creates an admin user and displays the token for easy copy-paste

set -e

API_URL="${API_URL:-http://localhost:3000}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔑 Quick Token Generator for Swagger UI${NC}"
echo "=========================================="

# Check if API is running
if ! curl -s "$API_URL/api/health" >/dev/null; then
    echo -e "${RED}❌ API is not running at $API_URL${NC}"
    echo "Please start the API with: docker-compose up -d"
    exit 1
fi

# Try to login with default credentials first
echo -e "${BLUE}🔄 Trying to login with default credentials...${NC}"

response=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"employeeId": "ADMIN001", "password": "admin123"}' \
  "$API_URL/api/employees/login" 2>/dev/null || echo -e "\n500")

status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [[ "$status_code" == "200" ]]; then
    token=$(echo "$body" | jq -r '.data.token' 2>/dev/null)
    employee_name=$(echo "$body" | jq -r '.data.employee.fullName' 2>/dev/null)

    if [[ "$token" != "null" && "$token" != "" ]]; then
        echo -e "${GREEN}✅ Login successful!${NC}"
        echo -e "${BLUE}👤 Employee: $employee_name${NC}"
        echo
        echo -e "${YELLOW}🔑 Your JWT Token:${NC}"
        echo "Bearer $token"
        echo
        echo -e "${BLUE}📋 How to use in Swagger UI:${NC}"
        echo "1. Go to: http://localhost:3000/api/docs"
        echo "2. Click the 🔒 'Authorize' button at the top"
        echo "3. Copy and paste this token (including 'Bearer '):"
        echo
        echo -e "${GREEN}Bearer $token${NC}"
        echo
        echo "4. Click 'Authorize' and then 'Close'"
        echo "5. Now you can test all protected endpoints!"

        # Save to file for scripts
        echo "$token" > .swagger-token
        echo
        echo -e "${BLUE}💾 Token saved to .swagger-token for scripts${NC}"
        exit 0
    fi
fi

# If login failed, try to create admin user
echo -e "${YELLOW}⚠️  Default admin not found. Creating admin employee...${NC}"

# Create admin using Docker exec
docker_result=$(docker-compose exec -T api node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const prisma = new PrismaClient();

  try {
    // Check if person exists
    const existingPerson = await prisma.person.findUnique({
      where: { cpf: '12345678901' }
    });

    if (existingPerson) {
      // Clean up existing records
      await prisma.auditLog.deleteMany({ where: { actorCpf: '12345678901' } });
      await prisma.timeEntry.deleteMany({ where: { employeeCpf: '12345678901' } });
      await prisma.employee.deleteMany({ where: { cpf: '12345678901' } });
      await prisma.person.deleteMany({ where: { cpf: '12345678901' } });
    }

    // Create person
    await prisma.person.create({
      data: {
        cpf: '12345678901',
        fullName: 'System Administrator',
        email: 'admin@cinema.com',
        phone: '11999999999'
      }
    });

    // Create admin employee
    const passwordHash = await bcrypt.hash('admin123', 12);
    await prisma.employee.create({
      data: {
        cpf: '12345678901',
        employeeId: 'ADMIN001',
        role: 'ADMIN',
        hireDate: new Date(),
        passwordHash,
        permissions: { all: true }
      }
    });

    console.log('ADMIN_CREATED');
    await prisma.\$disconnect();
  } catch (error) {
    console.error('CREATE_ERROR:', error.message);
    process.exit(1);
  }
}

createAdmin();
" 2>/dev/null)

if [[ "$docker_result" == *"ADMIN_CREATED"* ]]; then
    echo -e "${GREEN}✅ Admin employee created successfully!${NC}"

    # Now try to login again
    sleep 2
    response=$(curl -s -w "\n%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d '{"employeeId": "ADMIN001", "password": "admin123"}' \
      "$API_URL/api/employees/login")

    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [[ "$status_code" == "200" ]]; then
        token=$(echo "$body" | jq -r '.data.token' 2>/dev/null)

        echo -e "${GREEN}✅ Login successful with new admin!${NC}"
        echo
        echo -e "${YELLOW}🔑 Your JWT Token:${NC}"
        echo "Bearer $token"
        echo
        echo -e "${BLUE}📋 Default Admin Credentials:${NC}"
        echo "Employee ID: ADMIN001"
        echo "Password: admin123"
        echo
        echo -e "${BLUE}📋 How to use in Swagger UI:${NC}"
        echo "1. Go to: http://localhost:3000/api/docs"
        echo "2. Click the 🔒 'Authorize' button at the top"
        echo "3. Copy and paste this token (including 'Bearer '):"
        echo
        echo -e "${GREEN}Bearer $token${NC}"
        echo
        echo "4. Click 'Authorize' and then 'Close'"
        echo "5. Now you can test all protected endpoints!"

        # Save to file for scripts
        echo "$token" > .swagger-token
        echo
        echo -e "${BLUE}💾 Token saved to .swagger-token${NC}"
    else
        echo -e "${RED}❌ Failed to login after creating admin${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Failed to create admin employee${NC}"
    echo "Please check Docker containers are running: docker-compose ps"
    exit 1
fi