# Cinema Management System API Documentation

## 🌐 Base URL

- **Development**: `http://localhost:3000`
- **Production**: `https://api.yourcinema.com`

## 📋 API Overview

The Cinema Management System provides a RESTful API for managing cinema operations including movies, sessions, tickets, and sales.

### Response Format

All API responses follow this standard format:

```json
{
  "success": true,
  "data": <response_data>,
  "count": <number_of_items>,
  "message": "<optional_message>"
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "statusCode": 400
}
```

## 🎬 Sessions API

### GET /api/sessions
Get all available movie sessions.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "session_id": 1,
      "movie_title": "Avatar: The Way of Water",
      "room_name": "Sala 1",
      "room_type": "TWO_D",
      "start_time": "2024-12-15T14:00:00Z",
      "end_time": "2024-12-15T17:12:00Z",
      "status": "SCHEDULED",
      "base_price": "25.00",
      "available_seats": 148,
      "total_capacity": 150
    }
  ],
  "count": 5
}
```

### GET /api/sessions/:id
Get specific session details.

**Parameters:**
- `id` (number) - Session ID

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": 1,
    "movie_title": "Avatar: The Way of Water",
    "movie_description": "Set more than a decade after...",
    "room_name": "Sala 1",
    "room_type": "TWO_D",
    "capacity": 150,
    "base_price": "25.00"
  }
}
```

### GET /api/sessions/:id/seats
Get seat availability for a session.

**Response:**
```json
{
  "success": true,
  "data": {
    "seats": [
      {
        "row_label": "A",
        "number": 1,
        "seat_id": "A01",
        "is_accessible": false,
        "status": "AVAILABLE"
      }
    ],
    "seatMap": {
      "A": [...],
      "B": [...]
    },
    "available": 148,
    "sold": 2
  }
}
```

### POST /api/sessions
Create a new session.

**Request Body:**
```json
{
  "movie_id": 1,
  "room_id": 1,
  "start_time": "2024-12-15T20:00:00Z",
  "end_time": "2024-12-15T23:12:00Z"
}
```

## 🎫 Tickets API

### GET /api/tickets
Get all tickets.

### GET /api/tickets/:id
Get specific ticket details.

### POST /api/tickets
Create a single ticket.

**Request Body:**
```json
{
  "session_id": 1,
  "seat_id": "A05",
  "price": 25.00
}
```

### POST /api/tickets/bulk
Create multiple tickets at once.

**Request Body:**
```json
{
  "session_id": 1,
  "seat_ids": ["A05", "A06", "A07"],
  "price": 25.00
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "session_id": 1,
      "seat_id": "A05",
      "price": "25.00",
      "issued_at": "2024-12-15T10:30:00Z"
    }
  ],
  "count": 3,
  "message": "3 tickets created successfully"
}
```

### DELETE /api/tickets/:id
Cancel a ticket.

## 🛒 Sales API

### GET /api/sales
Get all sales with pagination.

**Query Parameters:**
- `limit` (number) - Number of results (default: 50)
- `offset` (number) - Pagination offset (default: 0)

### GET /api/sales/:id
Get detailed sale information including items and payments.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "status": "FINALIZED",
    "buyer_name": "João Silva",
    "cashier_name": "Pedro Almeida",
    "sub_total": "31.00",
    "discount_total": "3.10",
    "grand_total": "27.90",
    "items": [
      {
        "description": "Pipoca Grande",
        "quantity": 1,
        "unit_price": "15.50",
        "line_total": "15.50"
      }
    ],
    "payments": [
      {
        "method": "CARD",
        "amount": "27.90",
        "paid_at": "2024-12-15T10:45:00Z"
      }
    ]
  }
}
```

### POST /api/sales
Create a new sale.

**Request Body:**
```json
{
  "buyer_cpf": "12345678901",
  "cashier_cpf": "12345678905"
}
```

### POST /api/sales/:saleId/items
Add item to sale.

**Request Body:**
```json
{
  "description": "Pipoca Grande",
  "sku": "PIPOCA_G",
  "quantity": 1,
  "unit_price": 15.50
}
```

### POST /api/sales/:saleId/discount
Apply discount code to sale.

**Request Body:**
```json
{
  "discount_code": "WELCOME10"
}
```

### POST /api/sales/:saleId/finalize
Finalize sale with payment.

**Request Body:**
```json
{
  "payments": [
    {
      "method": "CARD",
      "amount": 27.90,
      "auth_code": "AUTH123456"
    }
  ]
}
```

### POST /api/sales/:saleId/cancel
Cancel a sale.

**Request Body:**
```json
{
  "reason": "Customer requested cancellation"
}
```

## ❤️ System Endpoints

### GET /api/health
System health check.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-12-15T10:30:00Z",
  "uptime": 3600.5,
  "memory": {
    "rss": 65847296,
    "heapTotal": 13418496,
    "heapUsed": 11558528
  },
  "environment": "development"
}
```

### GET /api
API documentation and available endpoints.

## 🔒 Error Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request (validation error) |
| 404  | Not Found |
| 409  | Conflict (e.g., seat already taken) |
| 429  | Too Many Requests (rate limit) |
| 500  | Internal Server Error |

## 📊 Rate Limiting

The API implements rate limiting to ensure fair usage:

- **General Endpoints**: 100 requests per 15 minutes per IP
- **Ticket Operations**: 20 requests per 5 minutes per IP  
- **Sale Operations**: 50 requests per 10 minutes per IP

Rate limit headers are included in responses:
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1640123456
```

## 🎯 Common Use Cases

### 1. Book Movie Tickets
1. `GET /api/sessions` - Browse available sessions
2. `GET /api/sessions/:id/seats` - Check seat availability
3. `POST /api/tickets/bulk` - Purchase tickets

### 2. Process Concession Sale
1. `POST /api/sales` - Create new sale
2. `POST /api/sales/:id/items` - Add items (multiple times)
3. `POST /api/sales/:id/discount` - Apply discount (optional)
4. `POST /api/sales/:id/finalize` - Process payment

### 3. Check Business Metrics
1. `GET /api/sales` - View sales history
2. `GET /api/tickets` - View ticket sales
3. Database queries for detailed reports

## 🔧 Development Tools

### Using cURL
```bash
# Get all sessions
curl http://localhost:3000/api/sessions

# Buy tickets
curl -X POST http://localhost:3000/api/tickets/bulk \
  -H "Content-Type: application/json" \
  -d '{"session_id": 1, "seat_ids": ["A05", "A06"]}'
```

### Using Demo Script
```bash
# Interactive demo
make demo

# Quick automated demo
make demo-quick
```

## 📝 Data Validation

All API endpoints use Joi schema validation:

- **CPF**: 11-digit Brazilian personal ID
- **Dates**: ISO 8601 format
- **Prices**: Decimal with 2 decimal places
- **IDs**: Positive integers
- **Strings**: Length limits enforced

## 🚀 Future API Enhancements

Planned for future versions:
- Authentication endpoints (`/api/auth`)
- User management (`/api/users`)
- Reporting endpoints (`/api/reports`)
- Inventory management (`/api/inventory`)
- Real-time updates via WebSockets

---

For more information, visit the [GitHub Repository](https://github.com/yourorg/cinema-management) or contact support@yourcinema.com