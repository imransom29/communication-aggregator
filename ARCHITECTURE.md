# Architecture Documentation

## High-Level Design (HLD)

### System Architecture Diagram

```
                                    ┌─────────────────────────────────────┐
                                    │         Client Application          │
                                    │      (Web/Mobile/API Client)        │
                                    └──────────────┬──────────────────────┘
                                                   │
                                                   │ HTTP POST
                                                   │ /api/messages
                                                   ▼
                        ┌──────────────────────────────────────────────────┐
                        │         Task Router Service (:3001)              │
                        │  ┌────────────────────────────────────────────┐  │
                        │  │  1. Request Validation                     │  │
                        │  │  2. Duplicate Detection (SHA-256 Hash)     │  │
                        │  │  3. Trace ID Generation                    │  │
                        │  │  4. Channel Routing Logic                  │  │
                        │  │  5. Retry Mechanism (3 attempts)           │  │
                        │  └────────────────────────────────────────────┘  │
                        └───────┬──────────────────────────┬───────────────┘
                                │                          │
                                │ Publish to Queue         │ Send Logs
                                │                          │
                                ▼                          ▼
            ┌───────────────────────────────┐    ┌──────────────────────┐
            │      RabbitMQ Message Bus     │    │   Logging Service    │
            │                               │    │      (:3003)         │
            │  ┌─────────────────────────┐  │    │                      │
            │  │   email_queue           │  │    │  ┌────────────────┐  │
            │  │   sms_queue             │  │    │  │ Log Collection │  │
            │  │   whatsapp_queue        │  │    │  │ & Processing   │  │
            │  └─────────────────────────┘  │    │  └────────┬───────┘  │
            │                               │    │           │          │
            │  Features:                    │    │           ▼          │
            │  - Persistent Messages        │    │  ┌────────────────┐  │
            │  - Prefetch Control           │    │  │ Elasticsearch  │  │
            │  - Dead Letter Queues         │    │  │   Indexing     │  │
            └───────────┬───────────────────┘    │  └────────────────┘  │
                        │                        └──────────────────────┘
                        │ Consume Messages                │
                        │                                 │
                        ▼                                 │
        ┌───────────────────────────────────┐             │
        │   Delivery Service (:3002)        │             │
        │                                   │             │
        │  ┌─────────────────────────────┐  │             │
        │  │  Message Consumer           │  │             │
        │  │  - Email Handler            │  │             │
        │  │  - SMS Handler              │  │             │
        │  │  - WhatsApp Handler         │  │             │
        │  └─────────────────────────────┘  │             │
        │                                   │             │
        │  ┌─────────────────────────────┐  │             │
        │  │  Delivery Simulation        │  │             │
        │  │  - Success Rate: 95-98%     │  │             │
        │  │  - Random Delays            │  │             │
        │  │  - Status Tracking          │  │             │
        │  └─────────────────────────────┘  │             │
        │                                   │             │
        │  ┌─────────────────────────────┐  │             │
        │  │  Storage Service            │  │             │
        │  │  - In-Memory Store          │  │             │
        │  │  - Message History          │  │             │
        │  │  - Delivery Stats           │  │             │
        │  └─────────────────────────────┘  │             │
        └───────────────┬───────────────────┘             │
                        │                                 │
                        │ Send Logs                       │
                        └─────────────────────────────────┘
                                         │
                                         ▼
                        ┌────────────────────────────────┐
                        │      Elasticsearch Cluster     │
                        │                                │
                        │  Index: communication-logs     │
                        │                                │
                        │  ┌──────────────────────────┐  │
                        │  │  Structured Logs         │  │
                        │  │  - Service Name          │  │
                        │  │  - Trace ID              │  │
                        │  │  - Log Level             │  │
                        │  │  - Timestamp             │  │
                        │  │  - Metadata              │  │
                        │  └──────────────────────────┘  │
                        └────────────┬───────────────────┘
                                     │
                                     │ Visualize
                                     ▼
                        ┌────────────────────────────────┐
                        │      Kibana Dashboard          │
                        │                                │
                        │  - Log Search & Analysis       │
                        │  - Real-time Monitoring        │
                        │  - Trace Visualization         │
                        │  - Error Tracking              │
                        └────────────────────────────────┘
```

## Data Flow Sequence

### 1. Message Submission Flow

```
Client → Task Router → RabbitMQ → Delivery Service → Logging Service → Elasticsearch
```

**Step-by-Step:**

1. **Client sends message request**
   - HTTP POST to `/api/messages`
   - Payload: `{ channel, to, subject, body, metadata }`

2. **Task Router processes request**
   - Generates unique trace ID
   - Validates request payload
   - Computes message hash (channel + to + body)
   - Checks for duplicates in cache
   - Routes to appropriate queue based on channel
   - Logs request to Logging Service

3. **RabbitMQ queues message**
   - Message persisted to disk
   - Waits for consumer

4. **Delivery Service consumes message**
   - Receives message from queue
   - Simulates delivery process
   - Updates message status
   - Sends delivery logs to Logging Service
   - Acknowledges or requeues message

5. **Logging Service indexes logs**
   - Receives logs from all services
   - Indexes in Elasticsearch
   - Makes searchable via API

### 2. Trace Flow Example

```
Request ID: msg-123
Trace ID: trace-abc-456

[Task Router] INFO: Received message request (traceId: trace-abc-456)
[Task Router] INFO: Message validated successfully (traceId: trace-abc-456)
[Task Router] INFO: Publishing to email_queue (traceId: trace-abc-456)
[Delivery Service] INFO: Received message from queue (traceId: trace-abc-456)
[Delivery Service] INFO: Delivering email to user@example.com (traceId: trace-abc-456)
[Delivery Service] INFO: Email delivered successfully (traceId: trace-abc-456)
```

## Communication Patterns

### 1. Synchronous Communication (HTTP)

**Used for:**
- Client → Task Router: Message submission
- Services → Logging Service: Log submission
- Client → Logging Service: Log queries

**Advantages:**
- Simple request-response model
- Immediate feedback
- Easy to implement and debug

**Disadvantages:**
- Tight coupling for some operations
- Blocking operations

### 2. Asynchronous Communication (RabbitMQ)

**Used for:**
- Task Router → Delivery Service: Message delivery

**Advantages:**
- **Decoupling:** Services can operate independently
- **Scalability:** Easy to add more consumers
- **Reliability:** Messages persisted, no data loss
- **Load Balancing:** Multiple consumers share load
- **Backpressure:** Prefetch limits prevent overload
- **Retry Logic:** Failed messages can be requeued

**Why RabbitMQ over alternatives?**

| Feature | RabbitMQ | Redis Streams | Kafka | Direct HTTP |
|---------|----------|---------------|-------|-------------|
| Persistence | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| Message Ordering | ✅ Per Queue | ✅ Per Stream | ✅ Per Partition | ❌ No |
| Acknowledgments | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| Dead Letter Queue | ✅ Built-in | ⚠️ Manual | ⚠️ Manual | ❌ No |
| Prefetch Control | ✅ Yes | ⚠️ Limited | ⚠️ Limited | ❌ No |
| Complexity | ⚠️ Medium | ✅ Low | ❌ High | ✅ Low |
| Best For | Task Queues | Event Streams | Event Logs | Simple APIs |

**Decision:** RabbitMQ chosen for its robust task queue features and built-in reliability mechanisms.

## Service Details

### Task Router Service

**Port:** 3001

**Responsibilities:**
1. API Gateway for message submission
2. Request validation
3. Duplicate detection
4. Message routing
5. Retry logic

**Key Components:**

```typescript
// Request Flow
Client Request
  ↓
Trace ID Middleware (generates/extracts trace ID)
  ↓
Validation Middleware (express-validator)
  ↓
Message Controller
  ↓
Message Service
  ↓
  ├─→ Deduplication Check (hash-based)
  ├─→ RabbitMQ Service (publish to queue)
  └─→ Logger (send logs to Logging Service)
```

**Deduplication Strategy:**

```typescript
Hash = SHA256(channel + to + body)
Store: Map<Hash, Timestamp>
TTL: 1 hour
Cleanup: Every 5 minutes
```

**Retry Logic:**

```typescript
Max Retries: 3
Delay: 5 seconds
Strategy: Exponential backoff
```

### Delivery Service

**Port:** 3002

**Responsibilities:**
1. Consume messages from RabbitMQ
2. Simulate message delivery
3. Track delivery status
4. Handle failures and retries

**Key Components:**

```typescript
// Consumer Flow
RabbitMQ Consumer
  ↓
Message Handler
  ↓
Delivery Service
  ↓
  ├─→ Email Handler (95% success rate)
  ├─→ SMS Handler (98% success rate)
  └─→ WhatsApp Handler (97% success rate)
  ↓
Storage Service (in-memory)
  ↓
Logger (send logs to Logging Service)
  ↓
ACK/NACK to RabbitMQ
```

**Delivery Simulation:**

```typescript
Email: 500-1500ms delay, 95% success
SMS: 300-1000ms delay, 98% success
WhatsApp: 400-1200ms delay, 97% success
```

**Retry Strategy:**

```typescript
Max Retries: 3
Requeue Delay: 5 seconds
After Max Retries: Move to DLQ (simulated)
```

### Logging Service

**Port:** 3003

**Responsibilities:**
1. Centralized log collection
2. Elasticsearch indexing
3. Log search API
4. Statistics and aggregations

**Key Components:**

```typescript
// Log Flow
Log Entry (from services)
  ↓
Log Controller
  ↓
Elasticsearch Service
  ↓
  ├─→ Index Creation
  ├─→ Document Indexing
  ├─→ Search Queries
  └─→ Aggregations
  ↓
Elasticsearch Cluster
```

**Log Structure:**

```json
{
  "level": "info",
  "message": "Message delivered successfully",
  "service": "delivery-service",
  "traceId": "trace-abc-456",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "metadata": {
    "messageId": "msg-123",
    "channel": "email",
    "to": "user@example.com"
  }
}
```

## Observability & Monitoring

### Trace ID Propagation

```
Client Request
  ↓
Task Router (generates trace-abc-456)
  ↓
RabbitMQ Message (includes trace-abc-456)
  ↓
Delivery Service (uses trace-abc-456)
  ↓
All Logs (tagged with trace-abc-456)
```

### Monitoring Points

1. **Task Router:**
   - Request rate
   - Validation errors
   - Duplicate detections
   - Queue publish failures

2. **Delivery Service:**
   - Message consumption rate
   - Delivery success/failure rates
   - Retry counts
   - Queue depth

3. **Logging Service:**
   - Log ingestion rate
   - Elasticsearch health
   - Query performance

4. **RabbitMQ:**
   - Queue depths
   - Message rates
   - Consumer connections
   - Unacknowledged messages

### Kibana Queries

```
# View all logs for a trace
traceId: "trace-abc-456"

# View all errors
level: "error"

# View delivery failures
service: "delivery-service" AND message: "failed"

# View high-priority messages
metadata.priority: "high"
```

## Scalability Considerations

### Horizontal Scaling

**Task Router:**
- Add more instances behind load balancer
- Share deduplication cache via Redis

**Delivery Service:**
- Add more consumers
- RabbitMQ automatically load balances

**Logging Service:**
- Add more instances
- Elasticsearch handles distribution

### Vertical Scaling

- Increase RabbitMQ memory for larger queues
- Increase Elasticsearch heap for better performance
- Increase service memory for higher throughput

## Security Considerations

### Current Implementation

- No authentication (development only)
- No encryption (local network)
- No rate limiting

### Production Requirements

1. **Authentication:**
   - JWT tokens for API access
   - Service-to-service mTLS

2. **Authorization:**
   - Role-based access control
   - API key management

3. **Encryption:**
   - TLS for all HTTP traffic
   - RabbitMQ SSL/TLS
   - Elasticsearch encryption at rest

4. **Rate Limiting:**
   - Per-client rate limits
   - DDoS protection

5. **Input Validation:**
   - Strict schema validation
   - SQL injection prevention
   - XSS protection

## Failure Scenarios & Handling

### 1. RabbitMQ Down

**Impact:** Messages cannot be queued
**Handling:**
- Task Router retries connection (5s delay)
- Returns 503 to client
- Logs error

### 2. Elasticsearch Down

**Impact:** Logs cannot be indexed
**Handling:**
- Logging Service continues accepting logs
- Fails silently (doesn't crash services)
- Logs to console as fallback

### 3. Delivery Service Down

**Impact:** Messages accumulate in queues
**Handling:**
- Messages persist in RabbitMQ
- No data loss
- Delivery resumes when service restarts

### 4. Duplicate Message

**Impact:** Same message sent twice
**Handling:**
- Detected by hash comparison
- Second request rejected with 409
- First message proceeds normally

## Performance Metrics

### Expected Throughput

- **Task Router:** 1000+ req/sec per instance
- **Delivery Service:** 500+ msg/sec per instance
- **Logging Service:** 2000+ logs/sec per instance

### Latency Targets

- **Message Submission:** < 100ms (p95)
- **Message Delivery:** < 2s (p95)
- **Log Indexing:** < 500ms (p95)
- **Log Search:** < 1s (p95)

## Future Enhancements

1. **GraphQL Support:** Add GraphQL API alongside REST
2. **WebSocket:** Real-time delivery status updates
3. **Message Templates:** Predefined message templates
4. **Scheduling:** Schedule messages for future delivery
5. **Batch Operations:** Send multiple messages in one request
6. **Analytics Dashboard:** Real-time metrics visualization
7. **A/B Testing:** Test different message variants
8. **Delivery Reports:** Detailed delivery analytics
9. **Webhook Support:** Notify external systems on delivery
10. **Multi-tenancy:** Support multiple organizations
