# Cinema Management System - Backend

A comprehensive backend API for managing cinema operations including sessions, tickets, sales, and inventory.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (if running without Docker)
- Make (for easy command execution)

### Using Makefile (Recommended)

The project includes a comprehensive Makefile for easy operation management.

1. **Get help and see all available commands**
   ```bash
   make help
   ```

2. **Complete setup and start services**
   ```bash
   make setup
   make up
   ```

3. **Quick development start**
   ```bash
   make dev
   ```

### Manual Docker Setup (Alternative)

1. **Clone and navigate to the project**
   ```bash
   cd backstage_backend
   ```

2. **Copy environment file**
   ```bash
   cp .env.example .env
   ```

3. **Start all services**
   ```bash
   docker-compose up -d
   ```

4. **Check services status**
   ```bash
   docker-compose ps
   ```

## 🔧 Makefile Commands

### Quick Start Commands
```bash
make setup      # Initial setup (copy .env, install deps, build)
make up         # Start all services
make dev        # Start development environment
make health     # Check application health
```

### Docker Operations
```bash
make build      # Build Docker images
make up         # Start all services in background
make down       # Stop all services
make restart    # Restart all services
make logs       # View logs from all services
make status     # Show status of all services
```

### Database Operations
```bash
make db-shell   # Connect to PostgreSQL shell
make db-reset   # Reset database (WARNING: Deletes all data)
make seed       # Seed database with sample data
make backup     # Create database backup
make restore    # Restore database from backup
```

### Development Commands
```bash
make install    # Install dependencies
make test       # Run tests
make lint       # Run ESLint
make format     # Format code
make dev-local  # Start local development server
```

### Maintenance
```bash
make clean      # Clean up containers and volumes
make monitor    # Monitor services performance
make prod       # Deploy production environment
```

### Services Available

| Service | URL | Description |
|---------|-----|-------------|
| API | http://localhost:3000 | Main API server |
| PostgreSQL | localhost:5432 | Database server |
| PgAdmin | http://localhost:8080 | Database admin interface |

### PgAdmin Database Interface

**Access PgAdmin:**
- URL: http://localhost:8080
- Email: `admin@cinema.com`
- Password: `admin123`

**Connect to Cinema Database:**
1. **Add New Server** (click the blue database icon)
2. **General Tab:**
   - Name: `Cinema Management Database`
3. **Connection Tab:**
   - Host: `postgres`
   - Port: `5432`
   - Database: `cinema_management`
   - Username: `cinema_user` 
   - Password: `cinema_pass`
   - Save password: ✅
4. **Save** to connect

**Navigate to Tables:**
After connecting, expand: `Cinema Management Database` → `Databases` → `cinema_management` → `Schemas` → `public` → `Tables`

**View Table Data:**
Right-click any table → `View/Edit Data` → `All Rows`

**Run SQL Queries:**
Click `Tools` → `Query Tool`, then try:
```sql
-- View all movies
SELECT * FROM movie;

-- Current sessions with details
SELECT s.id, m.title, r.name as room, s.start_time, s.status
FROM session s
JOIN movie m ON s.movie_id = m.id  
JOIN room r ON s.room_id = r.id;

-- Ticket sales summary
SELECT count(*) as total_tickets_sold FROM ticket;
```

## 📊 Database Schema

The system implements a comprehensive cinema management schema with:

- **People & Roles**: Person, Customer, Employee, Admin
- **Movies & Sessions**: Movie, Session, Room, Seat, Ticket
- **Sales & POS**: Sale, SaleItem, Payment, DiscountCode
- **Inventory**: InventoryItem, Food, Collectable
- **Auditing**: AuditLog, InventoryAdjustment

## 🔌 API Endpoints

### Sessions
- `GET /api/sessions` - List all sessions
- `GET /api/sessions/:id` - Get session details
- `GET /api/sessions/:id/seats` - Get seat availability
- `POST /api/sessions` - Create session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session

### Tickets
- `GET /api/tickets` - List all tickets
- `GET /api/tickets/:id` - Get ticket details
- `GET /api/tickets/session/:sessionId` - Get tickets by session
- `POST /api/tickets` - Create single ticket
- `POST /api/tickets/bulk` - Create multiple tickets
- `DELETE /api/tickets/:id` - Delete ticket

### Sales
- `GET /api/sales` - List all sales
- `GET /api/sales/:id` - Get sale details
- `POST /api/sales` - Create new sale
- `POST /api/sales/:saleId/items` - Add item to sale
- `DELETE /api/sales/:saleId/items/:itemId` - Remove item from sale
- `POST /api/sales/:saleId/discount` - Apply discount
- `POST /api/sales/:saleId/finalize` - Finalize sale with payment
- `POST /api/sales/:saleId/cancel` - Cancel sale

### System
- `GET /api/health` - Health check
- `GET /api` - API documentation

## 💾 Database Operations

### Development Database (With Sample Data)
The development database is automatically initialized when the PostgreSQL container starts with:
- Enum types creation
- Table creation with relationships  
- Sample data seeding (movies, sessions, inventory, etc.)

### Production Database (Empty)
For production deployment, use:
```bash
make prod  # Empty database, production-ready
```

This uses different initialization scripts that create:
- ✅ Database structure (tables, indexes, constraints)
- ✅ Required system data (room pricing only)
- ❌ NO sample data (movies, sessions, customers, etc.)

### Common Queries
Pre-written queries are available in `/database/scripts/common_queries.sql`:
- Session availability
- Sales reports
- Inventory management
- Customer analytics

### Manual Database Access
```bash
# Using Makefile (Recommended)
make db-shell

# Using Docker directly
docker exec -it cinema_postgres psql -U cinema_user -d cinema_management

# Or use PgAdmin at http://localhost:8080
```

## 🛠️ Development

### Local Development Setup

#### Using Makefile (Recommended)
```bash
# Quick development setup
make dev

# Or step by step
make setup      # Setup environment and dependencies
make dev-local  # Start local development server
```

#### Manual Setup
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start PostgreSQL (via Docker)
docker-compose up -d postgres

# Start development server
npm run dev
```

### Available Scripts
```bash
npm start        # Start production server
npm run dev      # Start development server with hot reload
npm test         # Run tests
npm run lint     # Run ESLint
npm run build    # Build project
```

### Environment Variables
```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cinema_management
DB_USER=cinema_user
DB_PASSWORD=cinema_pass

# Application
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## 🎬 Demo & Testing the API

After running `make dev`, you can demo the cinema management system using several methods:

### 1. 🌐 Browser Demo (Quick Start)

**API Documentation & Health Check:**
```bash
# Open in browser:
http://localhost:3000          # API overview and documentation
http://localhost:3000/api      # Detailed API endpoints
http://localhost:3000/health   # System health status
```

**PgAdmin Database Interface:**
```bash
# Open in browser:
http://localhost:8080
# Login: admin@cinema.com / admin123
```

### 2. 📡 API Testing with cURL

**Check System Status:**
```bash
# Verify API is running
curl http://localhost:3000/health

# Get API documentation
curl http://localhost:3000/api
```

**View Sample Data:**
```bash
# List available movie sessions
curl http://localhost:3000/api/sessions

# Check seat availability for a session
curl http://localhost:3000/api/sessions/1/seats

# View existing tickets
curl http://localhost:3000/api/tickets
```

### 3. 🎯 Complete Ticket Purchase Demo

**Step 1: Browse Available Sessions**
```bash
curl http://localhost:3000/api/sessions
```

**Step 2: Check Seat Availability**
```bash
curl http://localhost:3000/api/sessions/1/seats
```

**Step 3: Purchase Tickets**
```bash
curl -X POST http://localhost:3000/api/tickets/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "seat_ids": ["A03", "A04"]
  }'
```

**Step 4: Verify Ticket Creation**
```bash
curl http://localhost:3000/api/tickets/session/1
```

### 4. 🛒 Complete Sales Demo

**Step 1: Create a New Sale**
```bash
curl -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_cpf": "12345678901",
    "cashier_cpf": "12345678905"
  }'
```

**Step 2: Add Items to Sale**
```bash
# Add popcorn
curl -X POST http://localhost:3000/api/sales/1/items \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Pipoca Grande",
    "sku": "PIPOCA_G",
    "quantity": 2,
    "unit_price": 15.50
  }'

# Add drink
curl -X POST http://localhost:3000/api/sales/1/items \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Refrigerante Médio",
    "sku": "REFRI_M",
    "quantity": 2,
    "unit_price": 8.50
  }'
```

**Step 3: Apply Discount (Optional)**
```bash
curl -X POST http://localhost:3000/api/sales/1/discount \
  -H "Content-Type: application/json" \
  -d '{
    "discount_code": "WELCOME10"
  }'
```

**Step 4: View Sale Details**
```bash
curl http://localhost:3000/api/sales/1
```

**Step 5: Finalize Sale with Payment**
```bash
curl -X POST http://localhost:3000/api/sales/1/finalize \
  -H "Content-Type: application/json" \
  -d '{
    "payments": [{
      "method": "CARD",
      "amount": 43.20
    }]
  }'
```

### 5. 🔍 Database Exploration

**Connect to Database:**
```bash
make db-shell
```

**Run Sample Queries in PgAdmin:**

1. **Open Query Tool:** Click `Tools` → `Query Tool` from the top menu
2. **Copy and paste** any of these queries:
3. **Execute:** Press `F5` or click the ▶️ play button

```sql
-- View all sessions with movie details
SELECT 
  s.id, m.title, r.name as room, s.start_time, s.status
FROM session s 
JOIN movie m ON s.movie_id = m.id 
JOIN room r ON s.room_id = r.id;

-- Check ticket sales
SELECT 
  t.id, m.title, seat.row_label, seat.number, t.price
FROM ticket t
JOIN session s ON t.session_id = s.id
JOIN movie m ON s.movie_id = m.id
JOIN seat ON t.seatmap_id = seat.seatmap_id AND t.seat_id = seat.id;

-- View sales summary
SELECT 
  s.id, s.status, s.grand_total, p.full_name as buyer
FROM sale s
LEFT JOIN customer c ON s.buyer_cpf = c.cpf
LEFT JOIN person p ON c.cpf = p.cpf;

-- Check inventory levels
SELECT 
  i.sku, i.name, i.qty_on_hand, i.reorder_level,
  CASE WHEN i.qty_on_hand <= i.reorder_level THEN '⚠️ LOW STOCK' ELSE '✅ OK' END as status
FROM inventory_item i
ORDER BY i.qty_on_hand;

-- Room utilization
SELECT 
  r.name as room_name, r.room_type, 
  COUNT(s.id) as scheduled_sessions,
  COUNT(t.id) as tickets_sold
FROM room r
LEFT JOIN session s ON r.id = s.room_id
LEFT JOIN ticket t ON s.id = t.session_id
GROUP BY r.id, r.name, r.room_type
ORDER BY tickets_sold DESC;
```

### 6. 🧪 Advanced Testing

**Create a Custom Session:**
```bash
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{
    "movie_id": 2,
    "room_id": 2,
    "start_time": "2024-12-25T19:00:00Z",
    "end_time": "2024-12-25T21:11:00Z"
  }'
```

**Error Handling Demo:**
```bash
# Try to book an already taken seat
curl -X POST http://localhost:3000/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "seat_id": "A01"
  }'
```

### 7. 📊 Monitoring & Logs

**View Real-time Logs:**
```bash
make logs
```

**Check System Performance:**
```bash
make monitor
```

**Health Check:**
```bash
make health
```

### 🎮 Interactive Demo Scripts

**Complete Interactive Demo:**
```bash
# 1. Start the system
make dev

# 2. In another terminal, run the interactive demo
make demo
```

**Quick Demo (No interaction required):**
```bash
# After make dev, run:
make demo-quick
```

**Manual Demo Script:**
For a complete demo, run these commands in sequence:

```bash
# 1. Start the system
make dev

# 2. In another terminal, run the demo
echo "🎬 Cinema Management System Demo"
echo "================================"

echo "📋 Checking available sessions..."
curl -s http://localhost:3000/api/sessions | jq '.data[] | {id, movie_title, room_name, start_time, available_seats}'

echo "🎫 Purchasing tickets for session 1..."
curl -s -X POST http://localhost:3000/api/tickets/bulk \
  -H "Content-Type: application/json" \
  -d '{"session_id": 1, "seat_ids": ["B05", "B06"]}' | jq

echo "🛒 Creating a sale..."
SALE_ID=$(curl -s -X POST http://localhost:3000/api/sales \
  -H "Content-Type: application/json" \
  -d '{"buyer_cpf": "12345678901", "cashier_cpf": "12345678905"}' | jq -r '.data.id')

echo "🍿 Adding items to sale $SALE_ID..."
curl -s -X POST http://localhost:3000/api/sales/$SALE_ID/items \
  -H "Content-Type: application/json" \
  -d '{"description": "Combo 2", "sku": "COMBO_2", "quantity": 1, "unit_price": 18.00}' | jq

echo "💳 Finalizing sale..."
curl -s -X POST http://localhost:3000/api/sales/$SALE_ID/finalize \
  -H "Content-Type: application/json" \
  -d '{"payments": [{"method": "CARD", "amount": 18.00}]}' | jq

echo "✅ Demo completed!"
```

## 🔒 Security Features

- **Rate Limiting**: Different limits for various operations
- **Input Validation**: Joi schema validation
- **SQL Injection Protection**: Parameterized queries
- **CORS Configuration**: Configurable allowed origins
- **Helmet**: Security headers
- **Error Handling**: Comprehensive error responses

## 🏗️ Architecture

- **MVC Pattern**: Controllers, Models, Routes separation
- **Database Layer**: PostgreSQL with connection pooling
- **Validation**: Joi schema validation
- **Error Handling**: Global error handler with specific error types
- **Logging**: Morgan HTTP request logging
- **Security**: Helmet, CORS, rate limiting

## 📈 Monitoring

### Health Checks
- Container health checks included
- Database connection monitoring
- Application health endpoint

### Logging
- HTTP request logging via Morgan
- Database query logging
- Error logging with stack traces

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check if PostgreSQL is running
   docker-compose ps postgres
   
   # Check logs
   docker-compose logs postgres
   ```

2. **Port Already in Use**
   ```bash
   # Change port in docker-compose.yml or .env file
   PORT=3001
   ```

3. **Permission Denied**
   ```bash
   # Fix file permissions
   chmod +x docker-entrypoint-initdb.d/*.sql
   ```

### Reset Database
```bash
# Using Makefile (Recommended)
make db-reset

# Manual method
docker-compose down
docker-compose down -v  # WARNING: This deletes all data
docker-compose up -d
```

## 🎯 Common Workflows

### First Time Setup
```bash
make setup    # Install dependencies, copy .env, build images
make up       # Start all services
make health   # Verify everything is working
```

### Daily Development
```bash
make dev      # Start development environment
make logs     # Monitor logs in another terminal
make test     # Run tests when making changes
```

### Database Management
```bash
make db-shell   # Access database for queries
make backup     # Create backup before major changes
make db-reset   # Reset database when needed
```

### Troubleshooting
```bash
make status     # Check service status
make logs       # View service logs
make health     # Check API health
make clean      # Clean up and restart fresh
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.