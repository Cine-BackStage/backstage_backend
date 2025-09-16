# Cinema Management System - Makefile
# Easy commands for development and deployment

.PHONY: help install build up down restart logs clean test lint format status health db-shell db-reset seed backup restore dev prod

# Default target
help:
	@echo "Cinema Management System - Available Commands"
	@echo "=============================================="
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "  make setup     - Initial setup (copy .env, install deps, build)"
	@echo "  make up        - Start all services"
	@echo "  make dev       - Start development environment"
	@echo ""
	@echo "🐳 Docker Operations:"
	@echo "  make build     - Build Docker images"
	@echo "  make up        - Start all services in background"
	@echo "  make down      - Stop all services"
	@echo "  make restart   - Restart all services"
	@echo "  make rebuild   - Rebuild and restart all services"
	@echo "  make logs      - View logs from all services"
	@echo "  make status    - Show status of all services"
	@echo ""
	@echo "🗄️ Database Operations:"
	@echo "  make db-shell  - Connect to PostgreSQL shell"
	@echo "  make db-reset  - Reset database (WARNING: Deletes all data)"
	@echo "  make seed      - Seed database with sample data"
	@echo "  make backup    - Create database backup"
	@echo "  make restore   - Restore database from backup"
	@echo ""
	@echo "🔧 Development:"
	@echo "  make install   - Install dependencies"
	@echo "  make test      - Run tests"
	@echo "  make lint      - Run ESLint"
	@echo "  make format    - Format code"
	@echo "  make dev-local - Start local development server"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  make clean     - Clean up containers and volumes"
	@echo "  make fix       - Fix common issues and restart"
	@echo "  make health    - Check application health"
	@echo "  make prod      - Deploy production (empty database)"
	@echo "  make prod-with-pgadmin - Production with database admin"
	@echo ""
	@echo "🎬 Demo & Testing:"
	@echo "  make demo      - Run interactive demo script"
	@echo "  make demo-quick - Run quick automated demo"
	@echo ""

# Setup and Installation
setup: .env install build
	@echo "✅ Setup completed successfully!"
	@echo "Run 'make up' to start the services"

.env:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "📝 Created .env file from template"; \
		echo "⚠️  Please review and update .env with your configuration"; \
	else \
		echo "✅ .env file already exists"; \
	fi

install:
	@echo "📦 Installing dependencies..."
	@npm install

# Docker Operations
build:
	@echo "🔨 Building Docker images..."
	@docker-compose build --no-cache
	@echo "✅ Build completed!"

up:
	@echo "🚀 Starting all services..."
	@docker-compose up -d
	@echo "✅ Services started successfully!"
	@echo "🌐 API: http://localhost:3000"
	@echo "🗄️ PgAdmin: http://localhost:8080"
	@make health

down:
	@echo "🛑 Stopping all services..."
	@docker-compose down
	@echo "✅ All services stopped"

restart:
	@echo "🔄 Restarting all services..."
	@docker-compose down
	@docker-compose up -d
	@echo "✅ Services restarted successfully!"

rebuild:
	@echo "🔄 Rebuilding and restarting all services..."
	@docker-compose down
	@docker-compose build --no-cache
	@docker-compose up -d
	@echo "✅ Services rebuilt and restarted successfully!"

logs:
	@echo "📋 Viewing logs (Press Ctrl+C to exit)..."
	@docker-compose logs -f

status:
	@echo "📊 Service Status:"
	@docker-compose ps

# Database Operations
db-shell:
	@echo "🗄️ Connecting to PostgreSQL shell..."
	@echo "💡 Use \\q to exit"
	@docker-compose exec postgres psql -U cinema_user -d cinema_management

prisma-pull:
	@echo "🔄 Pulling database schema into Prisma..."
	@docker-compose exec api npx prisma db pull
	@echo "✅ Prisma schema generated from database"

prisma-generate:
	@echo "⚙️ Generating Prisma client..."
	@docker-compose exec api npx prisma generate
	@echo "✅ Prisma client generated"

prisma-studio:
	@echo "🎨 Starting Prisma Studio..."
	@echo "🌐 Prisma Studio will be available at: http://localhost:5555"
	@docker-compose exec api npx prisma studio --port 5555

db-reset:
	@echo "⚠️  WARNING: This will delete ALL data!"
	@read -p "Are you sure you want to reset the database? (y/N): " confirm && \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		echo "🗑️ Resetting database..."; \
		docker-compose down -v; \
		docker-compose up -d postgres; \
		sleep 5; \
		echo "✅ Database reset completed"; \
	else \
		echo "❌ Database reset cancelled"; \
	fi

seed:
	@echo "🌱 Seeding database with sample data..."
	@docker-compose exec postgres psql -U cinema_user -d cinema_management -f /docker-entrypoint-initdb.d/03_seed_data.sql
	@echo "✅ Database seeded successfully"

backup:
	@echo "💾 Creating database backup..."
	@mkdir -p ./backups
	@docker-compose exec postgres pg_dump -U cinema_user -d cinema_management > ./backups/cinema_backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in ./backups/"

restore:
	@echo "📥 Available backups:"
	@ls -la ./backups/ 2>/dev/null || echo "No backups found"
	@read -p "Enter backup filename: " filename && \
	if [ -f "./backups/$$filename" ]; then \
		docker-compose exec -T postgres psql -U cinema_user -d cinema_management < ./backups/$$filename; \
		echo "✅ Database restored successfully"; \
	else \
		echo "❌ Backup file not found"; \
	fi

# Development Commands
dev: .env
	@echo "🔧 Starting development environment..."
	@docker-compose -f docker-compose.yml up -d postgres pgadmin
	@echo "⏳ Waiting for database to be ready..."
	@sleep 5
	@npm run dev

dev-local: .env install
	@echo "🔧 Starting local development server..."
	@npm run dev

test:
	@echo "🧪 Running tests..."
	@npm test

lint:
	@echo "🔍 Running ESLint..."
	@npm run lint

format:
	@echo "🎨 Formatting code..."
	@npx prettier --write "src/**/*.js"

# Production
prod: .env build
	@echo "🚀 Deploying production environment..."
	@docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "✅ Production environment deployed"
	@echo "🗄️ Database is EMPTY (production-ready)"
	@echo "🌐 API: http://localhost:3000"

prod-with-pgadmin: .env build
	@echo "🚀 Deploying production with PgAdmin..."
	@docker-compose -f docker-compose.yml -f docker-compose.prod.yml --profile debug up -d
	@echo "✅ Production environment with PgAdmin deployed"
	@echo "🗄️ Database is EMPTY (production-ready)"
	@echo "🌐 API: http://localhost:3000"
	@echo "🗄️ PgAdmin: http://localhost:8080"

# Health and Monitoring
health:
	@echo "🏥 Checking application health..."
	@sleep 2
	@if curl -s http://localhost:3000/health > /dev/null; then \
		echo "✅ API is healthy"; \
		curl -s http://localhost:3000/health | grep -o '"status":"[^"]*"' | sed 's/"status":"\([^"]*\)"/Status: \1/'; \
	else \
		echo "❌ API is not responding"; \
	fi

# Maintenance
clean:
	@echo "🧹 Cleaning up containers, images, and volumes..."
	@docker-compose down -v --remove-orphans
	@docker system prune -f
	@docker volume prune -f
	@echo "✅ Cleanup completed"

fix:
	@echo "🔧 Running fix script..."
	@./fix.sh

# Utility targets
.PHONY: api-docs db-migrate db-rollback monitor
api-docs:
	@echo "📖 API Documentation available at:"
	@echo "🔗 http://localhost:3000/api"

db-migrate:
	@echo "🔄 Running database migrations..."
	@docker-compose exec api npm run migrate

db-rollback:
	@echo "⏪ Rolling back database migrations..."
	@docker-compose exec api npm run rollback

monitor:
	@echo "📊 Monitoring services (Press Ctrl+C to exit)..."
	@watch -n 2 'docker-compose ps && echo "" && docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"'

# Environment-specific targets
.env.development:
	@cp .env.example .env.development
	@sed -i.bak 's/NODE_ENV=development/NODE_ENV=development/' .env.development && rm .env.development.bak
	@echo "📝 Created .env.development"

.env.production:
	@cp .env.example .env.production
	@sed -i.bak 's/NODE_ENV=development/NODE_ENV=production/' .env.production && rm .env.production.bak
	@echo "📝 Created .env.production"

# Quick shortcuts
start: up
stop: down
shell: db-shell
reset: db-reset

# Demo commands
demo:
	@echo "🎬 Running interactive demo..."
	@./demo.sh

demo-quick:
	@echo "🚀 Running quick API demo..."
	@echo "📋 Available sessions:"
	@curl -s http://localhost:3000/api/sessions | jq '.data[] | {id, movie_title, room_name, start_time, available_seats}' || curl -s http://localhost:3000/api/sessions
	@echo ""
	@echo "🎫 Purchasing test tickets..."
	@curl -s -X POST http://localhost:3000/api/tickets/bulk -H "Content-Type: application/json" -d '{"session_id": 1, "seat_ids": ["D05", "D06"]}' | jq || echo "Tickets may already be sold"
	@echo ""
	@echo "✅ Quick demo completed!"