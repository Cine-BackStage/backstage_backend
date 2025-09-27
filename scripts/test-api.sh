#!/bin/bash

# Test Cinema Management API - Employee Endpoints
# This script tests various employee management endpoints

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
TOKEN_FILE=".current-token.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Check if token file exists and load token
load_token() {
  if [[ -f "$TOKEN_FILE" ]]; then
    TOKEN=$(jq -r '.token' "$TOKEN_FILE" 2>/dev/null)
    EMPLOYEE_NAME=$(jq -r '.employee.fullName' "$TOKEN_FILE" 2>/dev/null)

    if [[ "$TOKEN" != "null" && "$TOKEN" != "" ]]; then
      log_info "Using saved token for: $EMPLOYEE_NAME"
      return 0
    fi
  fi

  log_error "No valid token found. Please run: node scripts/get-token.js"
  exit 1
}

# Test API endpoint
test_endpoint() {
  local method="$1"
  local endpoint="$2"
  local description="$3"
  local data="$4"
  local expect_success="${5:-true}"

  echo
  log_info "Testing: $description"
  log_info "Endpoint: $method $endpoint"

  if [[ -n "$data" ]]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$API_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "Authorization: Bearer $TOKEN" \
      "$API_URL$endpoint")
  fi

  # Split response and status code
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  # Check if response is valid JSON and has success field
  success=$(echo "$body" | jq -r '.success' 2>/dev/null)

  if [[ "$expect_success" == "true" ]]; then
    if [[ "$status_code" -ge 200 && "$status_code" -lt 300 && "$success" == "true" ]]; then
      log_success "Response: $status_code"
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
      log_error "Response: $status_code"
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
  else
    if [[ "$status_code" -ge 400 ]]; then
      log_warning "Expected error: $status_code"
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
    else
      log_error "Expected error but got: $status_code"
      echo "$body" | jq '.' 2>/dev/null || echo "$body"
    fi
  fi
}

# Main testing function
run_tests() {
  echo "🧪 Testing Cinema Management API - Employee Endpoints"
  echo "=============================================="

  # Load token
  load_token

  # Test 1: Get current employee profile
  test_endpoint "GET" "/api/employees/me" "Get current employee profile"

  # Test 2: Get all employees
  test_endpoint "GET" "/api/employees" "Get all employees"

  # Test 3: Get employees with filters
  test_endpoint "GET" "/api/employees?role=ADMIN" "Filter employees by role"

  # Test 4: Search employees
  test_endpoint "GET" "/api/employees?search=Admin" "Search employees by name"

  # Test 5: Create new employee
  new_employee_data='{
    "cpf": "11111111111",
    "fullName": "Test Cashier",
    "email": "cashier@test.com",
    "phone": "11987654321",
    "employeeId": "CASH001",
    "role": "CASHIER",
    "password": "cashier123",
    "permissions": {"sales": true, "inventory": false}
  }'
  test_endpoint "POST" "/api/employees" "Create new employee" "$new_employee_data"

  # Test 6: Get employee by CPF
  test_endpoint "GET" "/api/employees/11111111111" "Get employee by CPF"

  # Test 7: Update employee
  update_data='{
    "fullName": "Test Cashier Updated",
    "permissions": {"sales": true, "inventory": true}
  }'
  test_endpoint "PUT" "/api/employees/11111111111" "Update employee" "$update_data"

  # Test 8: Clock in
  clock_in_data='{
    "notes": "Starting morning shift",
    "location": "Main entrance"
  }'
  test_endpoint "POST" "/api/employees/clock-in" "Clock in" "$clock_in_data"

  # Test 9: Clock out (after a short delay)
  sleep 2
  clock_out_data='{
    "notes": "End of shift",
    "location": "Main entrance"
  }'
  test_endpoint "POST" "/api/employees/clock-out" "Clock out" "$clock_out_data"

  # Test 10: Get time entries
  test_endpoint "GET" "/api/employees/time-entries" "Get time entries"

  # Test 11: Get activity logs
  test_endpoint "GET" "/api/employees/activity-logs" "Get activity logs"

  # Test 12: Get employee metrics
  test_endpoint "GET" "/api/employees/11111111111/metrics" "Get employee metrics"

  # Test 13: Test invalid endpoint (should fail)
  test_endpoint "GET" "/api/employees/invalid-cpf" "Test invalid CPF format" "" "false"

  echo
  log_success "All tests completed!"
  echo
  log_info "To clean up test data, you can run:"
  log_info "docker-compose exec api node -e \"
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.employee.delete({where: {cpf: '11111111111'}}).then(() => {
      return prisma.person.delete({where: {cpf: '11111111111'}});
    }).then(() => {
      console.log('Test employee cleaned up');
      prisma.\\\$disconnect();
    }).catch(console.error);
  \""
}

# Check dependencies
check_dependencies() {
  if ! command -v jq &> /dev/null; then
    log_error "jq is required but not installed. Please install jq first."
    exit 1
  fi

  if ! command -v curl &> /dev/null; then
    log_error "curl is required but not installed. Please install curl first."
    exit 1
  fi
}

# Main execution
main() {
  case "${1:-test}" in
    "test")
      check_dependencies
      run_tests
      ;;
    "help"|"-h"|"--help")
      echo "Usage: $0 [command]"
      echo
      echo "Commands:"
      echo "  test    Run all API tests (default)"
      echo "  help    Show this help message"
      echo
      echo "Environment variables:"
      echo "  API_URL    Base URL for the API (default: http://localhost:3000)"
      ;;
    *)
      log_error "Unknown command: $1"
      echo "Run '$0 help' for usage information"
      exit 1
      ;;
  esac
}

main "$@"