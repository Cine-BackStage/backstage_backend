# Employee Management Scripts

This directory contains utility scripts for managing employees and testing the Employee Management API endpoints.

## 🚀 Quick Start

### 1. Setup Admin Employee

Create an admin employee and get an access token:

```bash
# Using Docker (recommended)
docker-compose exec api npm run setup-admin

# Or directly (if running locally)
npm run setup-admin
```

This interactive script will:
- Create a new admin employee in the database
- Generate a JWT access token
- Save the token to `.admin-token.json` for easy access

### 2. Get Fresh Access Token

If you already have an employee account:

```bash
# Using Docker
docker-compose exec api npm run get-token

# Or directly
npm run get-token
```

### 3. Test API Endpoints

Run comprehensive tests on all employee endpoints:

```bash
# Using Docker
docker-compose exec api npm run test-api

# Or directly (requires jq and curl)
npm run test-api
```

## 📜 Available Scripts

### `setup-admin.js`

**Purpose**: Creates a new admin employee with full permissions and generates an access token.

**Features**:
- Interactive prompts for employee details
- Password hashing with bcrypt
- JWT token generation
- Saves token to `.admin-token.json`
- Handles existing employees (with option to overwrite)
- Comprehensive error handling

**Usage**:
```bash
docker-compose exec api node scripts/setup-admin.js
```

**Default Values**:
- CPF: `12345678901`
- Full Name: `System Administrator`
- Email: `admin@cinema.com`
- Phone: `11999999999`
- Employee ID: `ADMIN001`
- Password: `admin123`
- Role: `ADMIN`
- Permissions: Full access to all features

### `get-token.js`

**Purpose**: Authenticate with existing employee credentials to get a fresh JWT token.

**Features**:
- Login with employee ID and password
- JWT token generation
- Employee details display
- Saves token to `.current-token.json`
- API connection testing

**Usage**:
```bash
docker-compose exec api node scripts/get-token.js
```

### `test-api.sh`

**Purpose**: Comprehensive testing of all employee management endpoints.

**Features**:
- Tests all CRUD operations
- Tests authentication and authorization
- Tests time tracking (clock in/out)
- Tests activity logging
- Tests employee metrics
- Color-coded output
- Automatic token loading
- Error handling and validation

**Requirements**:
- `jq` (JSON processor)
- `curl` (HTTP client)
- Valid access token (from setup-admin or get-token)

**Usage**:
```bash
./scripts/test-api.sh
```

**Tests Performed**:
1. Get current employee profile
2. Get all employees
3. Filter employees by role
4. Search employees by name
5. Create new employee
6. Get employee by CPF
7. Update employee information
8. Clock in/out functionality
9. Get time entries
10. Get activity logs
11. Get employee performance metrics
12. Error handling tests

## 🔑 Token Management

### Token Files

- `.admin-token.json`: Token from admin setup
- `.current-token.json`: Token from login

### Token Format

```json
{
  "employee": {
    "cpf": "12345678901",
    "employeeId": "ADMIN001",
    "fullName": "System Administrator",
    "email": "admin@cinema.com",
    "role": "ADMIN"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "createdAt": "2025-09-27T04:00:00.000Z",
  "expiresAt": "2025-09-27T12:00:00.000Z"
}
```

### Using Tokens

#### In Shell Scripts:
```bash
# Load token from file
export TOKEN=$(jq -r '.token' .current-token.json)

# Use in API calls
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/employees/me
```

#### In API Testing:
```bash
# Test authentication
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/employees/me

# Create new employee
curl -X POST http://localhost:3000/api/employees \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "98765432100",
    "fullName": "Jane Doe",
    "email": "jane@cinema.com",
    "employeeId": "EMP002",
    "role": "MANAGER",
    "password": "manager123"
  }'
```

## 🧪 Testing Workflow

1. **Setup**: Create admin employee
   ```bash
   docker-compose exec api npm run setup-admin
   ```

2. **Test**: Run comprehensive API tests
   ```bash
   docker-compose exec api npm run test-api
   ```

3. **Manual Testing**: Use saved token for custom requests
   ```bash
   export TOKEN=$(docker-compose exec api jq -r '.token' .current-token.json)
   curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/employees
   ```

4. **Login**: Get fresh token when needed
   ```bash
   docker-compose exec api npm run get-token
   ```

## 🛠️ Environment Variables

- `API_URL`: Base URL for the API (default: `http://localhost:3000`)
- `JWT_SECRET`: Secret key for JWT token generation
- `JWT_EXPIRES_IN`: Token expiration time (default: `8h`)

## 📋 Employee Roles and Permissions

### Roles:
- `ADMIN`: Full system access
- `MANAGER`: Employee and operational management
- `CASHIER`: Sales and basic operations
- `MAINTENANCE`: System maintenance access
- `SECURITY`: Security monitoring access

### Permissions:
```json
{
  "all": true,           // Admin-only: bypass all checks
  "employees": true,     // Create/manage employees
  "sales": true,         // Process sales
  "inventory": true,     // Manage inventory
  "reports": true,       // View reports and analytics
  "system": true         // System configuration
}
```

## 🚨 Troubleshooting

### Common Issues:

1. **Database Connection Error**:
   ```
   Solution: Ensure Docker containers are running
   $ docker-compose up -d
   ```

2. **Token Expired**:
   ```
   Solution: Get a fresh token
   $ docker-compose exec api npm run get-token
   ```

3. **Permission Denied**:
   ```
   Solution: Ensure you're using an admin/manager token
   Check role: curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/employees/me
   ```

4. **Script Dependencies**:
   ```
   # Install jq on macOS
   $ brew install jq

   # Install jq on Ubuntu/Debian
   $ sudo apt-get install jq
   ```

### Debug Mode:

Enable verbose output for troubleshooting:
```bash
export DEBUG=true
./scripts/test-api.sh
```

## 📚 API Documentation

Full API documentation is available at: `http://localhost:3000/api/docs`

The Swagger documentation includes:
- All endpoint specifications
- Request/response schemas
- Authentication requirements
- Example requests and responses