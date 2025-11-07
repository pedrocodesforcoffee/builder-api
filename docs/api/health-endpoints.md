# Health Check Endpoints

## Overview

The Builder API provides three health check endpoints designed for monitoring application health and integration with container orchestration platforms like Kubernetes.

## Endpoints

### 1. Combined Health Check - `/health`

**Purpose**: Comprehensive health check of all system components

**Method**: GET

**Response Time**: < 100ms

**Status Codes**:
- `200 OK`: System is healthy or degraded but operational
- `503 Service Unavailable`: System is down or critical components unavailable

**Response Format**:
```json
{
  "status": "ok|error|degraded",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "details": {
    "database": {
      "status": "up",
      "responseTime": 5,
      "message": "PostgreSQL connection healthy",
      "connectionPool": {
        "active": 2,
        "idle": 8,
        "total": 10
      }
    },
    "memory": {
      "status": "up",
      "rss": 104857600,
      "heapUsed": 52428800,
      "heapTotal": 104857600,
      "external": 1048576,
      "percentUsed": 50,
      "systemMemory": {
        "total": 17179869184,
        "free": 8589934592,
        "used": 8589934592,
        "percentUsed": 50
      }
    },
    "cpu": {
      "status": "up",
      "usage": 15.5,
      "loadAverage": [0.5, 0.6, 0.7],
      "cores": 8,
      "userTime": 1000000,
      "systemTime": 500000
    }
  },
  "version": "1.0.0",
  "environment": "development",
  "responseTime": "45ms"
}
```

**Health Statuses**:
- `ok`: All indicators are healthy
- `degraded`: One or more indicators are degraded but operational
- `error`: One or more critical indicators are down

**Use Cases**:
- General monitoring dashboards
- Alerting systems
- Load balancer health checks

**Example**:
```bash
curl http://localhost:3000/health
```

---

### 2. Liveness Probe - `/health/liveness`

**Purpose**: Determine if the application is running and not deadlocked

**Method**: GET

**Response Time**: < 50ms

**Status Codes**:
- `200 OK`: Application is alive and responding
- `503 Service Unavailable`: Application is unresponsive (very rare)

**Response Format**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "details": {
    "liveness": {
      "status": "up",
      "message": "Application is running"
    }
  },
  "version": "1.0.0",
  "environment": "development",
  "responseTime": "2ms"
}
```

**Important Notes**:
- Does **NOT** check external dependencies (database, cache, etc.)
- Should almost always return 200 OK
- Kubernetes uses this to restart unhealthy pods
- If this fails, the application is likely deadlocked or crashed

**Kubernetes Configuration**:
```yaml
livenessProbe:
  httpGet:
    path: /health/liveness
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
```

**Example**:
```bash
curl http://localhost:3000/health/liveness
```

---

### 3. Readiness Probe - `/health/readiness`

**Purpose**: Determine if the application is ready to serve traffic

**Method**: GET

**Response Time**: < 100ms

**Status Codes**:
- `200 OK`: Application is ready to serve traffic
- `503 Service Unavailable`: Application is not ready (dependencies unavailable)

**Response Format**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600,
  "details": {
    "database": {
      "status": "up",
      "responseTime": 5,
      "message": "PostgreSQL connection healthy"
    },
    "readiness": {
      "status": "up",
      "message": "Application ready to serve traffic"
    }
  },
  "version": "1.0.0",
  "environment": "development",
  "responseTime": "12ms"
}
```

**Checks Performed**:
- Database connectivity
- Critical dependency availability

**Important Notes**:
- Returns 503 if database is unavailable
- Returns 200 even if database is degraded (slow)
- Kubernetes uses this to route traffic to healthy pods
- Pod will not receive traffic until readiness probe succeeds

**Kubernetes Configuration**:
```yaml
readinessProbe:
  httpGet:
    path: /health/readiness
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

**Example**:
```bash
curl http://localhost:3000/health/readiness
```

---

## Liveness vs Readiness

### When to Use Liveness Probe

Use liveness probes when you need to:
- Detect application deadlocks
- Restart unresponsive containers
- Handle application crashes gracefully

**Example Scenarios**:
- Application is stuck in an infinite loop
- Application has experienced a panic/crash
- Application threads are deadlocked

### When to Use Readiness Probe

Use readiness probes when you need to:
- Wait for application startup to complete
- Prevent traffic during dependency outages
- Gracefully handle temporary unavailability

**Example Scenarios**:
- Database is temporarily unavailable
- Application is warming up caches
- Application is under maintenance

### Key Differences

| Aspect | Liveness | Readiness |
|--------|----------|-----------|
| **Purpose** | Is the app alive? | Is the app ready? |
| **Failure Action** | Restart container | Remove from service |
| **Dependencies** | None checked | Database checked |
| **Response Time** | < 50ms | < 100ms |
| **Failure Tolerance** | Very low | Higher |

---

## Health Status Indicators

### Database Health

**Status Values**:
- `up`: Connection successful, response time < 500ms
- `degraded`: Connection successful, response time > 500ms
- `down`: Connection failed or timed out

**Metrics Included**:
- Response time in milliseconds
- Connection pool statistics
- Error messages (if any)

### Memory Health

**Status Values**:
- `up`: Memory usage < 80%
- `degraded`: Memory usage 80-90%
- `down`: Memory usage > 90%

**Metrics Included**:
- RSS (Resident Set Size)
- Heap used vs heap total
- External memory
- System memory statistics

### CPU Health

**Status Values**:
- `up`: CPU usage < 70%, load average normal
- `degraded`: CPU usage 70-85% or load average high
- `down`: CPU usage > 85% or load average critical

**Metrics Included**:
- Current CPU usage percentage
- Load average (1, 5, 15 minutes)
- Number of CPU cores
- Process CPU time

---

## Monitoring Integration

### Prometheus

```yaml
- job_name: 'builder-api'
  metrics_path: '/health'
  static_configs:
    - targets: ['localhost:3000']
  relabel_configs:
    - source_labels: [__address__]
      target_label: instance
```

### Datadog

```yaml
init_config:

instances:
  - url: http://localhost:3000/health
    name: builder-api
    timeout: 5
```

### New Relic

Configure synthetics monitor to check `/health` endpoint every 1 minute.

---

## Testing Health Endpoints

### Basic Test
```bash
# Test all endpoints
curl http://localhost:3000/health
curl http://localhost:3000/health/liveness
curl http://localhost:3000/health/readiness
```

### Performance Test
```bash
# Test average response time (10 requests)
for i in {1..10}; do
  curl -s -o /dev/null -w "%{time_total}\n" http://localhost:3000/health
done | awk '{sum+=$1} END {print "Average response time:", sum/NR*1000, "ms"}'
```

### Load Test with Apache Bench
```bash
ab -n 1000 -c 10 http://localhost:3000/health
```

### Expected Results
- Average response time: < 50ms
- 95th percentile: < 100ms
- 99th percentile: < 150ms
- Zero timeouts under normal load

---

## Troubleshooting

### Health Check Returns 503

1. **Check logs**: `docker logs <container-id>`
2. **Verify database**: `psql -h localhost -U postgres -d builder_api_dev -c "SELECT 1"`
3. **Check resources**: `top` or `htop` to verify CPU/memory
4. **Test manually**: `curl -v http://localhost:3000/health`

### Slow Response Times

1. **Check database performance**: Review `details.database.responseTime`
2. **Check memory pressure**: Review `details.memory.percentUsed`
3. **Check CPU load**: Review `details.cpu.usage` and `loadAverage`
4. **Enable query logging**: Set `DB_LOGGING=true`

### Liveness Probe Failing

This is critical - the application is likely:
- Deadlocked
- Crashed
- Out of memory
- Check application logs immediately

### Readiness Probe Failing

The application is alive but not ready:
- Database connection issues
- Dependency unavailable
- Application starting up
- Check database connectivity first

---

## Best Practices

1. **Set appropriate timeouts**: Don't set probe timeouts too low
2. **Use both probes**: Liveness and readiness serve different purposes
3. **Monitor response times**: Alert on slow health checks
4. **Test failure scenarios**: Regularly test what happens when dependencies fail
5. **Keep it lightweight**: Health checks should be fast and not resource-intensive
6. **Cache results**: Some checks are cached to prevent overload
7. **Log failures**: All health check failures are logged for debugging
