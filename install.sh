#!/bin/bash

# Communication Aggregator System - Installation Script
# This script automates the setup process

set -e

echo "================================================"
echo "Communication Aggregator System - Installation"
echo "================================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi
echo "✅ npm $(npm -v)"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
echo "✅ Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1)"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
echo "✅ Docker Compose $(docker-compose -v | cut -d' ' -f4 | cut -d',' -f1)"

echo ""
echo "All prerequisites met! ✅"
echo ""

# Install dependencies
echo "Installing dependencies..."
echo ""

echo "📦 Installing root dependencies..."
npm install

echo ""
echo "📦 Installing service dependencies..."
npm install --workspaces

echo ""
echo "✅ Dependencies installed successfully!"
echo ""

# Create environment files
echo "Creating environment files..."

if [ ! -f "packages/task-router/.env" ]; then
    cp packages/task-router/.env.example packages/task-router/.env
    echo "✅ Created packages/task-router/.env"
else
    echo "⚠️  packages/task-router/.env already exists, skipping"
fi

if [ ! -f "packages/delivery-service/.env" ]; then
    cp packages/delivery-service/.env.example packages/delivery-service/.env
    echo "✅ Created packages/delivery-service/.env"
else
    echo "⚠️  packages/delivery-service/.env already exists, skipping"
fi

if [ ! -f "packages/logging-service/.env" ]; then
    cp packages/logging-service/.env.example packages/logging-service/.env
    echo "✅ Created packages/logging-service/.env"
else
    echo "⚠️  packages/logging-service/.env already exists, skipping"
fi

echo ""

# Start infrastructure
echo "Starting infrastructure services (RabbitMQ, Elasticsearch, Kibana)..."
docker-compose up -d

echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Infrastructure services started successfully!"
else
    echo "⚠️  Some services may not have started properly. Check with: docker-compose ps"
fi

echo ""
echo "================================================"
echo "Installation Complete! 🎉"
echo "================================================"
echo ""
echo "Infrastructure Services:"
echo "  - RabbitMQ Management: http://localhost:15672 (guest/guest)"
echo "  - Elasticsearch: http://localhost:9200"
echo "  - Kibana: http://localhost:5601"
echo ""
echo "Next Steps:"
echo "  1. Build the services: npm run build --workspaces"
echo "  2. Start the services: npm run dev"
echo "  3. Test the API: See SETUP.md for examples"
echo ""
echo "Quick Start:"
echo "  npm run dev"
echo ""
echo "For detailed instructions, see SETUP.md"
echo ""
