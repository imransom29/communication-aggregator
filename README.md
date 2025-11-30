# Communication Aggregator System

A microservices-based backend system for intelligent message routing across multiple communication channels (Email, SMS, WhatsApp).

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [System Components](#system-components)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Services](#running-the-services)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Architecture Decisions](#architecture-decisions)
- [Troubleshooting](#troubleshooting)

## 🏗️ Architecture Overview

The system consists of 3 independent microservices that communicate asynchronously:

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Client    │─────▶│ Task Router  │─────▶│    RabbitMQ     │
└─────────────┘      │   Service    │      │  (Message Bus)  │
                     │   :3001      │      └────────┬────────┘
                     └──────┬───────┘               │
                            │                       │
                            ▼                       ▼
                     ┌──────────────┐      ┌─────────────────┐
                     │   Logging    │◀─────│    Delivery     │
                     │   Service    │      │    Service      │
                     │   :3003      │      │     :3002       │
                     └──────┬───────┘      └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │Elasticsearch │
                     │   + Kibana   │
                     └──────────────┘
```

### Data Flow

1. **Client** sends message request to **Task Router Service** (REST API)
2. **Task Router** validates, deduplicates, and routes to appropriate RabbitMQ queue
3. **Delivery Service** consumes messages from queues and simulates delivery
4. Both services send logs to **Logging Service**
5. **Logging Service** stores logs in Elasticsearch for analysis via Kibana

## 🔧 System Components

### 1. Task Router Service (Port 3001)

**Responsibilities:**
- Accept incoming message requests via REST API
- Validate message payload
- Implement message deduplication (prevents duplicate sends)
- Route messages to appropriate channel queue
- Retry logic for failed queue operations
- Distributed tracing with trace IDs

**Key Features:**
- Request validation using express-validator
- SHA-256 hash-based deduplication
- Automatic retry with exponential backoff
- Trace ID propagation for observability

### 2. Delivery Service (Port 3002)

**Responsibilities:**
- Consume messages from RabbitMQ queues
- Simulate message delivery for Email, SMS, WhatsApp
- Store delivery status in local storage
- Handle delivery failures with retry logic
- Send delivery logs to Logging Service

**Key Features:**
- Multi-channel support (Email, SMS, WhatsApp)
- Simulated delivery with configurable success rates
- In-memory message storage (can be replaced with DB)
- Automatic requeue on failure (max 3 retries)

### 3. Logging Service (Port 3003)

**Responsibilities:**
- Centralized log collection from all services
- Store logs in Elasticsearch
- Provide log search and trace analysis APIs
- Generate statistics and aggregations

**Key Features:**
- Structured logging with trace IDs
- Elasticsearch integration
- Log search by service, level, trace ID, time range
- Real-time statistics and aggregations

## Tech Stack

- **Runtime:** Node.js 18+ with TypeScript
- **Web Framework:** Express.js
- **Message Queue:** RabbitMQ
- **Search & Analytics:** Elasticsearch + Kibana
- **Logging:** Winston
- **Validation:** express-validator
- **Containerization:** Docker & Docker Compose

## Prerequisites

Before running the project, ensure you have:

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Docker** >= 20.x
- **Docker Compose** >= 2.x

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/imransom29/communication-aggregator.git
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install dependencies for all services
cd packages/task-router && npm install && cd ../..
cd packages/delivery-service && npm install && cd ../..
cd packages/logging-service && npm install && cd ../..
```

### 3. Set Up Environment Variables

Create `.env` files for each service:

**Task Router (.env):**
```bash
cp packages/task-router/.env.example packages/task-router/.env
```

**Delivery Service (.env):**
```bash
cp packages/delivery-service/.env.example packages/delivery-service/.env
```

**Logging Service (.env):**
```bash
cp packages/logging-service/.env.example packages/logging-service/.env
```

### 4. Start Infrastructure Services

```bash
# Start RabbitMQ, Elasticsearch, and Kibana
docker-compose up -d

# Verify services are running
docker-compose ps
```

**Service URLs:**
- RabbitMQ Management: http://localhost:15672 (guest/guest)
- Elasticsearch: http://localhost:9200
- Kibana: http://localhost:5601

### 5. Build TypeScript

```bash
# Build all services
npm run build
```

## 🏃 Running the Services

### Option 1: Run All Services (Development Mode)

```bash
npm run dev
```

This starts all three services concurrently in watch mode.

### Option 2: Run Services Individually

```bash
# Terminal 1 - Task Router
npm run dev:task-router

# Terminal 2 - Delivery Service
npm run dev:delivery

# Terminal 3 - Logging Service
npm run dev:logging
```

### Option 3: Production Mode

```bash
# Build first
npm run build

# Run all services
npm start
```

## 📡 API Documentation

### Task Router Service (http://localhost:3001)

#### Send Message

```bash
POST /api/messages
Content-Type: application/json

{
  "channel": "email",
  "to": "user@example.com",
  "subject": "Test Email",
  "body": "This is a test message",
  "metadata": {
    "priority": "high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message queued for processing",
  "messageId": "uuid-here",
  "traceId": "trace-id-here"
}
```

**Supported Channels:** `email`, `sms`, `whatsapp`

#### Health Check

```bash
GET /api/messages/health
```

### Logging Service (http://localhost:3003)

#### Search Logs

```bash
GET /api/logs/search?service=task-router&level=info&limit=50
```

**Query Parameters:**
- `service`: Filter by service name
- `level`: Filter by log level (info, warn, error, debug)
- `traceId`: Filter by trace ID
- `startTime`: Start time (ISO 8601)
- `endTime`: End time (ISO 8601)
- `limit`: Number of results (default: 100)

#### Get Logs by Trace ID

```bash
GET /api/logs/trace/:traceId
```

#### Get Statistics

```bash
GET /api/logs/stats
```

#### Health Check

```bash
GET /api/logs/health
```

## Testing

### Manual Testing with cURL

**1. Send an Email:**
```bash
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "email",
    "to": "test@example.com",
    "subject": "Hello",
    "body": "Test message"
  }'
```

**2. Send an SMS:**
```bash
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "sms",
    "to": "+1234567890",
    "body": "Test SMS"
  }'
```

**3. Send a WhatsApp Message:**
```bash
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "to": "+1234567890",
    "body": "Test WhatsApp message"
  }'
```

**4. Search Logs:**
```bash
curl "http://localhost:3003/api/logs/search?service=task-router&limit=10"
```

**5. Get Logs by Trace ID:**
```bash
curl "http://localhost:3003/api/logs/trace/YOUR_TRACE_ID"
```

### Testing Duplicate Detection

Send the same message twice - the second request should return a 409 error:

```bash
# First request - Success
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -d '{"channel":"email","to":"test@example.com","body":"Same message"}'

# Second request - Duplicate detected
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -d '{"channel":"email","to":"test@example.com","body":"Same message"}'
```

## Architecture Decisions

### 1. Communication Pattern: RabbitMQ (Message Queue)

**Why RabbitMQ?**
- **Asynchronous Processing:** Decouples services, allowing independent scaling
- **Reliability:** Persistent messages ensure no data loss
- **Load Balancing:** Multiple consumers can process messages in parallel
- **Retry Logic:** Built-in dead letter queues for failed messages
- **Backpressure Handling:** Prefetch limits prevent consumer overload

**Alternatives Considered:**
- **Redis Streams:** Simpler but less feature-rich
- **Kafka:** Overkill for this use case, better for event streaming
- **Direct HTTP:** Tight coupling, no retry mechanism

### 2. Logging Strategy: Centralized with Elasticsearch

**Why Elasticsearch?**
- **Full-text Search:** Powerful query capabilities
- **Aggregations:** Real-time analytics and statistics
- **Scalability:** Handles large log volumes
- **Kibana Integration:** Visualization and troubleshooting
- **Trace Analysis:** Group logs by trace ID for request tracking

### 3. Deduplication Strategy: Hash-based with TTL

**Implementation:**
- SHA-256 hash of `channel + to + body`
- In-memory store with 1-hour TTL
- Automatic cleanup every 5 minutes

**Production Considerations:**
- Replace with Redis for distributed systems
- Implement sliding window for better accuracy

### 4. Retry Mechanism

**Task Router:**
- 3 retry attempts for RabbitMQ publish
- 5-second delay between retries

**Delivery Service:**
- 3 retry attempts for message delivery
- Requeue with delay on failure
- Move to DLQ after max retries (simulated)

## Monitoring & Observability

### Trace IDs

Every request gets a unique trace ID that flows through all services:

1. Client sends request → Task Router generates trace ID
2. Trace ID added to message metadata
3. Delivery Service uses same trace ID
4. All logs tagged with trace ID
5. Query logs by trace ID to see complete journey

### Kibana Dashboards

Access Kibana at http://localhost:5601

**Useful Queries:**
```
# All errors
level: "error"

# Specific service logs
service: "task-router"

# Trace a request
traceId: "your-trace-id"

# Failed deliveries
message: "delivery failed"
```

### RabbitMQ Management

Access at http://localhost:15672 (guest/guest)

**Monitor:**
- Queue depths
- Message rates
- Consumer connections
- Failed deliveries

## Troubleshooting

### Services Won't Start

**Check if ports are available:**
```bash
lsof -i :3001  # Task Router
lsof -i :3002  # Delivery Service
lsof -i :3003  # Logging Service
lsof -i :5672  # RabbitMQ
lsof -i :9200  # Elasticsearch
```

### RabbitMQ Connection Failed

```bash
# Check if RabbitMQ is running
docker-compose ps rabbitmq

# View RabbitMQ logs
docker-compose logs rabbitmq

# Restart RabbitMQ
docker-compose restart rabbitmq
```

### Elasticsearch Not Responding

```bash
# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# View Elasticsearch logs
docker-compose logs elasticsearch

```

### Logs Not Appearing in Elasticsearch

1. Check Logging Service is running
2. Verify Elasticsearch connection: `curl http://localhost:9200`
3. Check if index exists: `curl http://localhost:9200/communication-logs`
4. View Logging Service logs for errors

### Messages Not Being Delivered

1. Check Delivery Service is running and connected to RabbitMQ
2. View RabbitMQ queues: http://localhost:15672/#/queues
3. Check for messages in queues
4. View Delivery Service logs for errors

## Project Structure

```
communication-aggregator/
├── packages/
│   ├── task-router/          # Task Router Service
│   │   ├── src/
│   │   │   ├── config/       # Configuration
│   │   │   ├── controllers/  # Route handlers
│   │   │   ├── middleware/   # Express middleware
│   │   │   ├── routes/       # API routes
│   │   │   ├── services/     # Business logic
│   │   │   ├── types/        # TypeScript types
│   │   │   ├── utils/        # Utilities
│   │   │   └── index.ts      # Entry point
│   │   └── package.json
│   ├── delivery-service/     # Delivery Service
│   │   ├── src/
│   │   │   ├── config/
│   │   │   ├── services/
│   │   │   ├── types/
│   │   │   ├── utils/
│   │   │   └── index.ts
│   │   └── package.json
│   └── logging-service/      # Logging Service
│       ├── src/
│       │   ├── config/
│       │   ├── controllers/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── types/
│       │   └── index.ts
│       └── package.json
├── docker-compose.yml        # Infrastructure services
├── package.json              # Root package
└── README.md                 # This file
```

##  Considerations

1. **Database:** Replace in-memory storage with PostgreSQL/MongoDB
2. **Redis:** Use Redis for distributed deduplication
3. **Load Balancer:** Add Nginx/HAProxy for service distribution
4. **Monitoring:** Add Prometheus + Grafana
5. **Security:** Add API authentication (JWT)
6. **Rate Limiting:** Implement rate limiting per client
7. **Dead Letter Queue:** Proper DLQ implementation in RabbitMQ
8. **Health Checks:** Kubernetes liveness/readiness probes
9. **Secrets Management:** Use Vault or AWS Secrets Manager
10. **CI/CD:** Add GitHub Actions for automated testing/deployment

