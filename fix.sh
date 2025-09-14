#!/bin/bash

# Fix script for cinema management system
echo "🔧 Cinema Management System - Fix Script"
echo "======================================="

# Stop all containers first
echo "🛑 Stopping all containers..."
docker-compose down

# Remove any orphaned containers from other projects
echo "🧹 Cleaning up orphaned containers..."
docker-compose down --remove-orphans

# Remove the problematic volumes if they exist
echo "🗑️  Removing old volumes..."
docker volume rm backstage_backend_postgres_data 2>/dev/null || true
docker volume rm backstage_backend_pgadmin_data 2>/dev/null || true

# Build fresh images
echo "🔨 Building fresh Docker images..."
docker-compose build --no-cache

# Start the services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to initialize..."
sleep 10

# Check service status
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "🏥 Testing API health..."
sleep 5

if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ API is now responding!"
    echo "🌐 API: http://localhost:3000"
    echo "🗄️ PgAdmin: http://localhost:8080"
    echo "📖 API Docs: http://localhost:3000/api"
else
    echo "❌ API is still not responding. Check logs with: docker-compose logs"
fi

echo ""
echo "📋 To view logs, run: docker-compose logs -f"
echo "🎬 To run demo, run: ./demo.sh"