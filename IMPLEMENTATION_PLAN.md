# Cinema Management System - Implementation Plan

## Overview
This document tracks the implementation progress of the Cinema Management System, including both backend (Node.js/Express) and frontend (Flutter) components.

---

## Phase 1: Foundation & Authentication ✅ COMPLETE
**Status**: Completed
**Duration**: Initial sprint

### Backend
- [x] Multi-tenant architecture setup
- [x] PostgreSQL database schema with Prisma ORM
- [x] JWT authentication system
- [x] User roles and permissions (ADMIN, MANAGER, CASHIER)
- [x] Company management
- [x] Employee management with role-based access

### Frontend
- [x] Flutter project structure with Clean Architecture
- [x] BLoC state management setup
- [x] Authentication flow (login/logout)
- [x] Token management and persistence
- [x] Role-based UI navigation

---

## Phase 2: Inventory Management ✅ COMPLETE
**Status**: Completed

### Backend
- [x] Product/inventory CRUD operations
- [x] Stock management (quantity tracking)
- [x] Category management
- [x] SKU-based inventory system

### Frontend
- [x] Product listing and search
- [x] Product creation and editing
- [x] Stock level indicators
- [x] Inventory management UI

---

## Phase 3: Point of Sale (POS) ✅ COMPLETE
**Status**: Completed

### Backend
- [x] Sale creation and management
- [x] Sale items with quantities
- [x] Payment processing (multiple payment methods)
- [x] Discount code application
- [x] Sale finalization with validation
- [x] Sale cancellation with reason tracking

### Frontend
- [x] POS interface with product grid
- [x] Shopping cart management
- [x] Payment dialog (CASH, CREDIT, DEBIT, PIX)
- [x] Discount application
- [x] Sale completion flow
- [x] Receipt generation

---

## Phase 4: Sessions & Tickets ✅ COMPLETE
**Status**: Completed

### Backend
- [x] Movie management (CRUD operations)
- [x] Room management with seat maps
- [x] Session scheduling with date/time
- [x] Seat availability checking
- [x] Ticket creation and QR code generation
- [x] Ticket validation system
- [x] **Seat reservation system** (temporary 15-minute holds)
- [x] **Transaction-safe sale finalization** (prevents orphaned tickets)
- [x] Integration with POS sales
- [x] Session availability logic (checks reservations and sold tickets)

### Frontend
- [x] Movie listing and details
- [x] Session browsing by date/movie
- [x] Visual seat selection interface
- [x] Seat type and pricing display
- [x] **Local seat tracking** (prevents duplicate selection in same session)
- [x] **Dual-layer reservation system** (local + backend)
- [x] POS ticket sales integration
- [x] Session selection dialog
- [x] Ticket item display with session details

### Key Features Implemented
1. **Seat Reservation System**:
   - Temporary 15-minute seat holds without creating sales
   - Prevents abandoned OPEN sales from locking seats permanently
   - Auto-expiring reservations via `expires_at` timestamp
   - Reservation tokens for tracking and releasing holds

2. **Transaction Safety**:
   - Wrapped sale finalization in database transaction
   - Finalize sale → Create tickets → Release reservations (atomic)
   - If any step fails, entire operation rolls back
   - Prevents orphaned tickets or permanently locked seats

3. **Local + Backend State Sync**:
   - Local `SeatReservationManager` for current session UI feedback
   - Backend `seat_reservation` table for cross-session integrity
   - Migration logic when sale ID changes from LOCAL_ to real UUID
   - Prevents selecting same seat twice in same POS session

### Database Schema Updates
- Added `seat_reservation` table with:
  - Company, session, seat foreign keys
  - Reservation token for tracking
  - `expires_at` timestamp (15 minutes)
  - Unique constraint on seat per session

### API Endpoints Added
- `POST /api/seat-reservations/reserve` - Reserve seats temporarily
- `POST /api/seat-reservations/release` - Release reservations by token
- `POST /api/seat-reservations/cleanup` - Clean expired reservations

---

## Phase 5: Session Management Hub 🚧 IN PROGRESS
**Status**: Planning
**Priority**: High

### Overview
Comprehensive management interface for sessions, movies, and rooms with soft-delete functionality to maintain data integrity and historical records.

### 5.1 Session Management
**Objective**: Create, edit, and soft-delete cinema sessions

#### Backend Tasks
- [ ] Add `deleted_at` timestamp field to `session` table (nullable)
- [ ] Update session queries to filter out soft-deleted records (`WHERE deleted_at IS NULL`)
- [ ] Create `DELETE /api/sessions/:id` endpoint (soft delete)
- [ ] Create `POST /api/sessions/:id/restore` endpoint (restore soft-deleted)
- [ ] Update session listing to exclude deleted sessions
- [ ] Add admin-only endpoint to view deleted sessions
- [ ] Cascade soft-delete: when session deleted, soft-delete all related tickets

#### Frontend Tasks
- [ ] Session management screen with CRUD operations
- [ ] Session creation form (movie, room, date/time, base price)
- [ ] Session editing capability
- [ ] Soft delete confirmation dialog
- [ ] Visual indicator for session status (active, past, cancelled)
- [ ] Filter by date range, movie, room
- [ ] Capacity and occupancy display

#### Business Rules
- Sessions cannot be hard-deleted (data preservation)
- Soft-deleting a session marks it as `deleted_at = NOW()`
- Deleted sessions don't appear in public session listings
- Deleted sessions still accessible in admin panel for reporting
- Tickets for deleted sessions remain in database but marked accordingly
- Cannot create tickets for soft-deleted sessions

---

### 5.2 Movie Management
**Objective**: Manage movie catalog with soft-delete cascade

#### Backend Tasks
- [ ] Add `deleted_at` timestamp field to `movie` table (nullable)
- [ ] Update movie queries to filter out soft-deleted records
- [ ] Create `DELETE /api/movies/:id` endpoint (soft delete)
- [ ] Create `POST /api/movies/:id/restore` endpoint
- [ ] **Cascade logic**: When movie soft-deleted, auto soft-delete all sessions for that movie
- [ ] Update session queries to check both session AND movie `deleted_at`
- [ ] Add admin-only endpoint to view deleted movies

#### Frontend Tasks
- [ ] Movie management screen with grid/list view
- [ ] Movie creation form (title, description, duration, genre, rating, poster)
- [ ] Movie editing capability
- [ ] Soft delete with cascade warning ("This will also remove all sessions for this movie")
- [ ] Restore functionality
- [ ] Filter by genre, rating, status (active/deleted)
- [ ] View active sessions count per movie

#### Business Rules
- Movies cannot be hard-deleted (data preservation)
- Soft-deleting a movie automatically soft-deletes all associated sessions
- Cascade warning must be shown before deletion
- Deleted movies don't appear in session creation dropdown
- Movie restore does NOT restore sessions (manual restore required)
- Cannot create sessions for soft-deleted movies

---

### 5.3 Room Management
**Objective**: Manage cinema rooms and seat maps with soft-delete

#### Backend Tasks
- [ ] Add `deleted_at` timestamp field to `room` table (nullable)
- [ ] Update room queries to filter out soft-deleted records
- [ ] Create `DELETE /api/rooms/:id` endpoint (soft delete)
- [ ] Create `POST /api/rooms/:id/restore` endpoint
- [ ] **Cascade logic**: When room soft-deleted, auto soft-delete all sessions for that room
- [ ] Update session queries to check both session AND room `deleted_at`
- [ ] Add admin-only endpoint to view deleted rooms

#### Frontend Tasks
- [ ] Room management screen with list view
- [ ] Room creation form (name, capacity, seat map configuration)
- [ ] Room editing capability
- [ ] Soft delete with cascade warning ("This will also remove all sessions in this room")
- [ ] Restore functionality
- [ ] Visual seat map editor
- [ ] Filter by status (active/deleted)
- [ ] View active sessions count per room

#### Business Rules
- Rooms cannot be hard-deleted (data preservation)
- Soft-deleting a room automatically soft-deletes all associated sessions
- Cascade warning must be shown before deletion
- Deleted rooms don't appear in session creation dropdown
- Room restore does NOT restore sessions (manual restore required)
- Cannot create sessions for soft-deleted rooms

---

### 5.4 Cascade Delete Rules Summary

```
Movie Deleted → All Sessions for Movie Deleted
Room Deleted → All Sessions in Room Deleted
Session Deleted → Session Hidden (tickets remain in DB)
```

**Important Notes**:
1. All deletes are soft deletes (`deleted_at` timestamp)
2. Cascade deletes happen automatically on movie/room deletion
3. Restore operations do NOT cascade (must restore manually)
4. Deleted entities invisible in frontend by default
5. Admin panel shows deleted entities with restore option
6. Historical data preserved for reporting and analytics

---

### 5.5 Database Migrations Required

#### Migration 1: Add Soft Delete Columns
```sql
ALTER TABLE movie ADD COLUMN deleted_at TIMESTAMP(6);
ALTER TABLE room ADD COLUMN deleted_at TIMESTAMP(6);
ALTER TABLE session ADD COLUMN deleted_at TIMESTAMP(6);

CREATE INDEX idx_movie_deleted_at ON movie(deleted_at);
CREATE INDEX idx_room_deleted_at ON room(deleted_at);
CREATE INDEX idx_session_deleted_at ON session(deleted_at);
```

#### Migration 2: Update Prisma Schema
```prisma
model Movie {
  // ... existing fields
  deletedAt DateTime? @map("deleted_at") @db.Timestamp(6)
  @@map("movie")
}

model Room {
  // ... existing fields
  deletedAt DateTime? @map("deleted_at") @db.Timestamp(6)
  @@map("room")
}

model Session {
  // ... existing fields
  deletedAt DateTime? @map("deleted_at") @db.Timestamp(6)
  @@map("session")
}
```

---

### 5.6 API Endpoints Summary

#### Movies
- `GET /api/movies` - List active movies
- `GET /api/movies/deleted` - List deleted movies (admin only)
- `GET /api/movies/:id` - Get movie details
- `POST /api/movies` - Create movie
- `PUT /api/movies/:id` - Update movie
- `DELETE /api/movies/:id` - Soft delete movie (cascades to sessions)
- `POST /api/movies/:id/restore` - Restore soft-deleted movie

#### Rooms
- `GET /api/rooms` - List active rooms
- `GET /api/rooms/deleted` - List deleted rooms (admin only)
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms` - Create room
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Soft delete room (cascades to sessions)
- `POST /api/rooms/:id/restore` - Restore soft-deleted room

#### Sessions
- `GET /api/sessions` - List active sessions
- `GET /api/sessions/deleted` - List deleted sessions (admin only)
- `GET /api/sessions/:id` - Get session details
- `POST /api/sessions` - Create session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Soft delete session
- `POST /api/sessions/:id/restore` - Restore soft-deleted session

---

## Phase 6: Reports & Analytics 📋 PLANNED
**Status**: Not Started
**Priority**: Medium

### Features to Implement
- [ ] Sales reports (daily, weekly, monthly)
- [ ] Ticket sales analytics
- [ ] Revenue tracking by movie/session
- [ ] Inventory consumption reports
- [ ] Employee performance metrics
- [ ] Occupancy rate reports
- [ ] Export to PDF/Excel

---

## Phase 7: Advanced Features 🎯 FUTURE
**Status**: Backlog

### Potential Features
- [ ] Online ticket booking (customer-facing app)
- [ ] Email/SMS ticket delivery
- [ ] Loyalty program integration
- [ ] Dynamic pricing based on demand
- [ ] Concession pre-order
- [ ] Reserved seating upgrades
- [ ] Multi-language support
- [ ] Accessibility features

---

## Technical Debt & Improvements 🔧

### Backend
- [ ] Add comprehensive API documentation (Swagger/OpenAPI)
- [ ] Implement rate limiting
- [ ] Add request logging and monitoring
- [ ] Optimize database queries with proper indexing
- [ ] Add caching layer (Redis)
- [ ] Implement automated testing (Jest)
- [ ] Add database backup automation

### Frontend
- [ ] Add unit tests for BLoCs
- [ ] Add widget tests for critical flows
- [ ] Implement offline mode support
- [ ] Add error boundary handling
- [ ] Optimize image loading and caching
- [ ] Add analytics tracking
- [ ] Implement push notifications

---

## Notes
- All phases follow Clean Architecture principles
- Backend uses multi-tenant architecture (company_id scoping)
- Frontend uses BLoC for state management
- All dates/times stored in UTC, displayed in local timezone
- Soft delete preserves data for auditing and reporting
- Cascade deletes prevent orphaned sessions
