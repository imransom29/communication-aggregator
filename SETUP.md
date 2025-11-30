# Quick Setup Guide

This guide will help you get the Communication Aggregator System up and running quickly.

## Prerequisites Check

```bash
# Check Node.js version (should be >= 18)
node --version

# Check npm version (should be >= 9)
npm --version

# Check Docker version
docker --version

# Check Docker Compose version
docker-compose --version
```

## Step-by-Step Setup

### 1. Navigate to Project Directory

```bash
cd /Users/sirvinayak/CascadeProjects/communication-aggregator
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all service dependencies
npm install --workspaces
```

Alternatively, install for each service individually:

```bash
cd packages/task-router && npm install && cd ../..
cd packages/delivery-service && npm install && cd ../..
cd packages/logging-service && npm install && cd ../..
```

### 3. Create Environment Files

```bash
# Task Router
cp packages/task-router/.env.example packages/task-router/.env

# Delivery Service
cp packages/delivery-service/.env.example packages/delivery-service/.env

# Logging Service
cp packages/logging-service/.env.example packages/logging-service/.env
```

### 4. Start Infrastructure Services

```bash
# Start RabbitMQ, Elasticsearch, and Kibana
docker-compose up -d

# Wait for services to be healthy (30-60 seconds)
docker-compose ps

# Check logs if needed
docker-compose logs -f
```

**Verify Infrastructure:**

```bash
# RabbitMQ
curl http://localhost:15672
# Should show RabbitMQ Management UI

# Elasticsearch
curl http://localhost:9200
# Should return cluster info

# Kibana
curl http://localhost:5601
# Should return Kibana page
```

### 5. Build Services

```bash
# Build all TypeScript services
cd packages/task-router && npm run build && cd ../..
cd packages/delivery-service && npm run build && cd ../..
cd packages/logging-service && npm run build && cd ../..
```

Or use the root command:

```bash
npm run build --workspaces
```

### 6. Start Services

**Option A: Development Mode (Recommended for testing)**

```bash
# Start all services with hot reload
npm run dev
```

This will start:
- Task Router on http://localhost:3001
- Delivery Service on http://localhost:3002 (background consumer)
- Logging Service on http://localhost:3003

**Option B: Individual Services**

Open 3 terminal windows:

```bash
# Terminal 1
npm run dev:task-router

# Terminal 2
npm run dev:delivery

# Terminal 3
npm run dev:logging
```

**Option C: Production Mode**

```bash
npm start
```

### 7. Verify Services are Running

```bash
# Check Task Router
curl http://localhost:3001/health

# Check Logging Service
curl http://localhost:3003/health

# Check RabbitMQ queues (should show 3 queues)
curl -u guest:guest http://localhost:15672/api/queues
```

### 8. Test the System

**Send a test message:**

```bash
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "to": "test@example.com",
    "subject": "Test Email",
    "body": "This is a test message"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Message queued for processing",
  "messageId": "some-uuid",
  "traceId": "some-trace-id"
}
```

**Check logs:**

```bash
# Get the traceId from the response above, then:
curl "http://localhost:3003/api/logs/trace/YOUR_TRACE_ID"
```

You should see logs from both Task Router and Delivery Service.

## Common Issues & Solutions

### Issue: Port Already in Use

```bash
# Find process using port
lsof -i :3001  # or :3002, :3003, :5672, :9200

# Kill the process
kill -9 <PID>
```

### Issue: Docker Services Not Starting

```bash
# Stop all containers
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Start fresh
docker-compose up -d
```

### Issue: RabbitMQ Connection Failed

```bash
# Check RabbitMQ is running
docker-compose ps rabbitmq

# Check RabbitMQ logs
docker-compose logs rabbitmq

# Restart RabbitMQ
docker-compose restart rabbitmq
```

### Issue: Elasticsearch Not Responding

```bash
# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# Increase memory if needed (edit docker-compose.yml)
# Change: ES_JAVA_OPTS=-Xms512m -Xmx512m
# To: ES_JAVA_OPTS=-Xms1g -Xmx1g

# Restart Elasticsearch
docker-compose restart elasticsearch
```

### Issue: TypeScript Compilation Errors

```bash
# Clean and rebuild
rm -rf packages/*/dist
npm run build --workspaces
```

### Issue: Module Not Found Errors

```bash
# Reinstall dependencies
rm -rf node_modules packages/*/node_modules
npm install
npm install --workspaces
```

## Testing Checklist

- [ ] All infrastructure services running (RabbitMQ, Elasticsearch, Kibana)
- [ ] All application services running (Task Router, Delivery, Logging)
- [ ] Can send email message successfully
- [ ] Can send SMS message successfully
- [ ] Can send WhatsApp message successfully
- [ ] Duplicate detection works (send same message twice)
- [ ] Logs appear in Elasticsearch
- [ ] Can search logs by trace ID
- [ ] Can view logs in Kibana
- [ ] RabbitMQ queues show messages being processed

## Next Steps

1. **Import Postman Collection:**
   - Open Postman
   - Import `postman_collection.json`
   - Test all endpoints

2. **Explore Kibana:**
   - Open http://localhost:5601
   - Go to "Discover"
   - Select `communication-logs` index
   - Explore logs and create visualizations

3. **Monitor RabbitMQ:**
   - Open http://localhost:15672
   - Login with guest/guest
   - Monitor queues and message rates

4. **Read Architecture Documentation:**
   - See `ARCHITECTURE.md` for detailed system design
   - Understand data flow and communication patterns

## Development Workflow

```bash
# Make code changes
# Services auto-reload in dev mode

# View logs
npm run dev  # Shows all service logs

# Run specific service
npm run dev:task-router

# Build for production
npm run build

# Run tests (when implemented)
npm test
```

## Stopping Services

```bash
# Stop application services
# Press Ctrl+C in the terminal running npm run dev

# Stop infrastructure services
docker-compose down

# Stop and remove volumes (deletes data)
docker-compose down -v
```

## Clean Slate

To start completely fresh:

```bash
# Stop everything
docker-compose down -v

# Remove all node_modules
rm -rf node_modules packages/*/node_modules

# Remove all build artifacts
rm -rf packages/*/dist

# Reinstall
npm install
npm install --workspaces

# Rebuild
npm run build --workspaces

# Start infrastructure
docker-compose up -d

# Start services
npm run dev
```

## Support

If you encounter issues not covered here:

1. Check service logs for errors
2. Verify all prerequisites are met
3. Ensure ports are not in use
4. Check Docker has enough resources allocated
5. Review the main README.md for detailed documentation

## Quick Reference

**Service URLs:**
- Task Router API: http://localhost:3001
- Logging Service API: http://localhost:3003
- RabbitMQ Management: http://localhost:15672 (guest/guest)
- Elasticsearch: http://localhost:9200
- Kibana: http://localhost:5601

**Key Commands:**
```bash
npm run dev          # Start all services (dev mode)
npm run build        # Build all services
npm start            # Start all services (prod mode)
docker-compose up -d # Start infrastructure
docker-compose down  # Stop infrastructure
```
