# Runbook - Builder API Operations Guide

## Local Development Setup

### Prerequisites
1. Install Node.js 18+ from https://nodejs.org/
2. Install PostgreSQL 14+ from https://www.postgresql.org/download/
   - Ensure PostgreSQL is running and accessible
   - Default port: 5432
3. Install Redis from https://redis.io/download/ (optional for local development)

### Setup Steps

1. **Clone and Install**
```bash
git clone https://github.com/bobthebuilder/builder-api.git
cd builder-api
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your local configuration
```

3. **Database Setup**
```bash
# Create development database
createdb builder_api_dev

# Alternatively, using psql
psql -U postgres -c "CREATE DATABASE builder_api_dev;"

# Verify connection
psql -h localhost -p 5432 -U postgres -d builder_api_dev -c "SELECT 1;"

# Run migrations
npm run migration:run
```

4. **Build Application**
```bash
# Build TypeScript
npm run build
```

5. **Start Development Server**
```bash
# Start with hot-reload
npm run start:dev

# Or start production mode
npm run start:prod
```

The API should now be running at http://localhost:3000

---

## Environment Variables

### Application Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment name | `development` | `development`, `staging`, `production` |
| `PORT` | Server port | `3000` | `3000` |
| `API_PREFIX` | Global API prefix | `api` | `api`, `v1` |

### Database Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DB_HOST` | Database host | `localhost` | `localhost`, `db.example.com` |
| `DB_PORT` | Database port | `5432` | `5432` |
| `DB_NAME` | Database name | `builder_api_dev` | `builder_api_dev` |
| `DB_USER` | Database username | `postgres` | `postgres` |
| `DB_PASSWORD` | Database password | `postgres` | `your-secure-password` |
| `DB_SSL` | Enable SSL connection | `false` | `true`, `false` |
| `DB_SYNCHRONIZE` | Auto-sync schema (**never use in production!**) | `false` | `false` |
| `DB_LOGGING` | Enable query logging | `true` | `true`, `false` |

### Connection Pool Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `DB_POOL_SIZE` | Maximum pool size | `10` | `10`, `20` |
| `DB_POOL_IDLE_TIMEOUT` | Idle timeout (ms) | `10000` | `10000` |
| `DB_CONNECTION_TIMEOUT` | Connection timeout (ms) | `2000` | `2000` |
| `DB_STATEMENT_TIMEOUT` | Query timeout (ms) | `30000` | `30000` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `LOG_LEVEL` | Logging level | `debug`, `info`, `warn`, `error` |

---

## Database Management

### Migrations

**Important**: Always build the application before running migrations.

```bash
# Generate a new migration from entity changes
npm run migration:generate -- src/migrations/MigrationName

# Create an empty migration file
npm run migration:create src/migrations/MigrationName

# Run all pending migrations
npm run migration:run

# Rollback last migration
npm run migration:revert

# Check migration status
npm run migration:show
```

**Migration Best Practices:**
- Always review generated migrations before running them
- Test migrations in development first
- Never set `DB_SYNCHRONIZE=true` in production
- Keep migrations small and focused
- Use descriptive names for migrations
- Backup database before running migrations in production

### Seeding

```bash
# Seed database with test data
npm run seed

# Seed specific data
npm run seed -- --file seeds/users.js
```

### Backup and Restore

```bash
# Create backup
pg_dump -Fc builder_api_dev -U postgres > backup_$(date +%Y%m%d_%H%M%S).dump

# Restore from backup
pg_restore -d builder_api_dev -U postgres backup_file.dump

# Backup to S3 (production)
pg_dump -Fc builder_api_dev | aws s3 cp - s3://backups/db_$(date +%Y%m%d).dump
```

### Connection Troubleshooting

**Issue: Cannot connect to database**

1. **Verify PostgreSQL is running**
```bash
# Check PostgreSQL status (macOS/Linux)
pg_isready -h localhost -p 5432

# Check service status
brew services list | grep postgresql  # macOS
systemctl status postgresql           # Linux
```

2. **Verify database exists**
```bash
psql -U postgres -l | grep builder_api
```

3. **Test connection with psql**
```bash
psql -h localhost -p 5432 -U postgres -d builder_api_dev -c "SELECT 1;"
```

4. **Check environment variables**
```bash
# Verify .env file is loaded
cat .env | grep DB_
```

5. **Review connection errors**
```bash
# Check application logs for connection errors
npm run start:dev 2>&1 | grep -i "database\|connection"
```

**Issue: Connection pool exhausted**

- Increase `DB_POOL_SIZE` (default: 10)
- Check for connection leaks in application code
- Monitor active connections:
```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'builder_api_dev';
```

**Issue: Slow queries**

- Enable query logging: `DB_LOGGING=true`
- Check `DB_STATEMENT_TIMEOUT` (default: 30000ms)
- Analyze slow queries:
```sql
SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

### Connection Pool Tuning

**Development:**
- Pool Size: 5-10 connections
- Idle Timeout: 10 seconds
- Connection Timeout: 2 seconds

**Production:**
- Pool Size: 20-50 connections (based on load)
- Idle Timeout: 30 seconds
- Connection Timeout: 5 seconds
- Statement Timeout: 60 seconds

**Formula for pool sizing:**
```
connections = ((core_count * 2) + effective_spindle_count)
```

For most web applications:
- Small: 10-20 connections
- Medium: 20-50 connections
- Large: 50-100 connections

---

## Running the Application

### Development Mode

```bash
# Start with auto-reload
npm run dev

# Start with debug mode
npm run dev:debug

# Start with inspector
npm run dev:inspect
```

### Production Mode

```bash
# Build (if using TypeScript)
npm run build

# Start production server
npm start
```

---

## Health Check Monitoring

The Builder API provides comprehensive health check endpoints for monitoring application status and integration with orchestration platforms like Kubernetes.

### Health Endpoints

1. **Combined Health Check**: `GET /health`
   - Checks all system components (database, memory, CPU)
   - Returns 200 (healthy/degraded) or 503 (down)
   - Response time: < 100ms

2. **Liveness Probe**: `GET /health/liveness`
   - Checks if application is running (not deadlocked)
   - No external dependencies checked
   - Always returns 200 unless app is crashed
   - Response time: < 50ms

3. **Readiness Probe**: `GET /health/readiness`
   - Checks if application is ready for traffic
   - Includes database connectivity check
   - Returns 503 if dependencies unavailable
   - Response time: < 100ms

### Testing Health Endpoints

```bash
# Check overall health
curl http://localhost:3000/health

# Check liveness (for Kubernetes)
curl http://localhost:3000/health/liveness

# Check readiness (for load balancers)
curl http://localhost:3000/health/readiness

# Check with timing
curl -w "\nResponse time: %{time_total}s\n" http://localhost:3000/health
```

### Health Status Meanings

**Overall Status:**
- `ok`: All systems healthy
- `degraded`: Some systems slow but operational
- `error`: Critical systems down

**Component Status:**
- `up`: Component healthy
- `degraded`: Component slow/warning
- `down`: Component unavailable

### Health Check Thresholds

Configure thresholds via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `HEALTH_CHECK_TIMEOUT` | 1000ms | Max time for health checks |
| `HEALTH_CHECK_CACHE_TTL` | 5000ms | Cache duration for results |
| `HEALTH_MEMORY_THRESHOLD` | 80% | Memory warning threshold |
| `HEALTH_CPU_THRESHOLD` | 70% | CPU warning threshold |
| `HEALTH_DB_RESPONSE_TIME_THRESHOLD` | 500ms | Database slow query threshold |

### Monitoring Integration

**Kubernetes Liveness Probe:**
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

**Kubernetes Readiness Probe:**
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

### Troubleshooting Unhealthy States

**Database Down (503 on /health/readiness):**
1. Check database is running: `pg_isready -h localhost -p 5432`
2. Verify connection: `psql -h localhost -U postgres -d builder_api_dev -c "SELECT 1"`
3. Check connection pool: Review `details.database.connectionPool` in health response
4. Check logs: `npm run start:dev 2>&1 | grep -i database`

**High Memory Usage (degraded/error):**
1. Review current usage: `curl http://localhost:3000/health | jq '.details.memory'`
2. Check for memory leaks: Monitor over time
3. Restart application if memory critically high
4. Adjust `HEALTH_MEMORY_THRESHOLD` if needed

**High CPU Usage (degraded/error):**
1. Review current usage: `curl http://localhost:3000/health | jq '.details.cpu'`
2. Check load average vs cores
3. Identify CPU-intensive operations in logs
4. Scale horizontally if sustained high load

**Slow Health Checks (> 100ms):**
1. Check database query performance
2. Review connection pool exhaustion
3. Monitor system resources
4. Check for blocking operations

### Alerting Recommendations

**Critical Alerts (immediate action):**
- Liveness probe failing (app crashed/deadlocked)
- Readiness probe failing for > 5 minutes (no traffic)
- Overall health status = `error`
- CPU usage > 90%
- Memory usage > 90%

**Warning Alerts (investigate soon):**
- Health status = `degraded` for > 15 minutes
- Database response time > 500ms consistently
- Memory usage > 80%
- CPU usage > 70%
- Connection pool > 80% utilized

**Monitoring Best Practices:**
1. Check health endpoints every 5-10 seconds
2. Set up alerts for both liveness and readiness failures
3. Monitor response times and alert on degradation
4. Track health status trends over time
5. Create dashboards showing all health metrics
6. Test failure scenarios regularly

See [Health Endpoints Documentation](api/health-endpoints.md) for complete API details.

---

## Structured Logging

The Builder API uses Pino for high-performance structured logging with JSON output, request tracking, and correlation IDs for distributed tracing.

### Log Levels

Logs are written at different levels based on severity:

| Level | Usage | Example |
|-------|-------|---------|
| `debug` | Detailed debugging information | Method entry/exit, variable values |
| `info` | General informational messages | Request/response logs, business events |
| `warn` | Warning messages, degraded performance | Slow queries, high memory usage |
| `error` | Error events, exceptions | Failed requests, database errors |
| `fatal` | Critical errors requiring immediate attention | Application crash, unrecoverable errors |

### Log Configuration

Configure logging behavior via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | Minimum log level to output |
| `LOG_FORMAT` | `json` | Log output format (`json` or `pretty`) |
| `LOG_PRETTY` | `false` | Enable pretty-printing for development |
| `LOG_INCLUDE_TIMESTAMP` | `true` | Include timestamp in logs |
| `LOG_INCLUDE_HOSTNAME` | `true` | Include hostname in logs |
| `LOG_REDACT_SENSITIVE` | `true` | Redact passwords, tokens, etc. |
| `LOG_SKIP_HEALTH_CHECK` | `true` | Skip logging health check endpoints |
| `LOG_SLOW_QUERY_THRESHOLD` | `100` | Threshold (ms) for slow query warnings |
| `LOG_SLOW_HTTP_THRESHOLD` | `1000` | Threshold (ms) for slow HTTP warnings |

**Environment-Specific Defaults:**
- Development: `LOG_LEVEL=debug`, `LOG_PRETTY=true`
- Staging: `LOG_LEVEL=info`, `LOG_PRETTY=false`
- Production: `LOG_LEVEL=warn`, `LOG_PRETTY=false`
- Test: `LOG_LEVEL=error`, `LOG_PRETTY=false`

### Log Format

**JSON Format (Production):**
```json
{
  "level": "info",
  "timestamp": "2024-11-07T07:00:00.000Z",
  "pid": 12345,
  "service": "builder-api",
  "version": "1.0.0",
  "environment": "production",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "correlationId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "method": "GET",
  "url": "/api/users/123",
  "statusCode": 200,
  "duration": 45,
  "msg": "Request completed"
}
```

**Pretty Format (Development):**
```
[11:00:00.000] INFO: Request completed
    requestId: "550e8400-e29b-41d4-a716-446655440000"
    correlationId: "7c9e6679-7425-40de-944b-e07fc1f90ae7"
    method: "GET"
    url: "/api/users/123"
    statusCode: 200
    duration: 45ms
```

### Request and Correlation IDs

Every HTTP request is assigned two identifiers:

**Request ID (`X-Request-ID`):**
- Unique identifier for a single HTTP request
- Generated automatically or accepted from incoming headers
- Included in all logs during request processing
- Returned in response headers

**Correlation ID (`X-Correlation-ID`):**
- Identifier for tracking requests across multiple services
- Propagated through microservice calls
- Used for distributed tracing
- Persists across the entire user transaction

**Usage Example:**
```bash
# Send request with correlation ID
curl -H "X-Correlation-ID: my-trace-123" http://localhost:3000/api/users

# All logs for this request will include correlationId: "my-trace-123"
# Response headers will include both X-Request-ID and X-Correlation-ID
```

### Searching and Filtering Logs

**By Request ID:**
```bash
# Development (pretty logs)
npm run start:dev 2>&1 | grep "550e8400-e29b-41d4-a716-446655440000"

# Production (JSON logs)
cat logs/app.log | jq 'select(.requestId == "550e8400-e29b-41d4-a716-446655440000")'
```

**By Correlation ID:**
```bash
# Track entire user flow across services
cat logs/app.log | jq 'select(.correlationId == "7c9e6679-7425-40de-944b-e07fc1f90ae7")'
```

**By Log Level:**
```bash
# All errors
cat logs/app.log | jq 'select(.level == "error")'

# Errors and warnings
cat logs/app.log | jq 'select(.level == "error" or .level == "warn")'
```

**By Endpoint:**
```bash
# All requests to /api/users
cat logs/app.log | jq 'select(.url | startswith("/api/users"))'
```

**By Status Code:**
```bash
# All 5xx errors
cat logs/app.log | jq 'select(.statusCode >= 500)'

# All 4xx client errors
cat logs/app.log | jq 'select(.statusCode >= 400 and .statusCode < 500)'
```

**By Duration (Slow Requests):**
```bash
# Requests taking longer than 1 second
cat logs/app.log | jq 'select(.duration > 1000)'
```

**By Time Range:**
```bash
# Logs from last hour
cat logs/app.log | jq 'select(.timestamp > "'$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)'")'
```

### Common Log Queries

**Find all errors in the last 24 hours:**
```bash
cat logs/app.log | \
  jq 'select(.level == "error" and .timestamp > "'$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S)'")' | \
  jq -s 'group_by(.msg) | map({message: .[0].msg, count: length})' | \
  jq 'sort_by(.count) | reverse'
```

**Find slowest endpoints:**
```bash
cat logs/app.log | \
  jq 'select(.duration != null)' | \
  jq -s 'sort_by(.duration) | reverse | .[0:10]'
```

**Count requests by endpoint:**
```bash
cat logs/app.log | \
  jq 'select(.url != null)' | \
  jq -s 'group_by(.url) | map({endpoint: .[0].url, count: length})' | \
  jq 'sort_by(.count) | reverse'
```

**Find requests with errors for specific user:**
```bash
cat logs/app.log | \
  jq 'select(.userId == "123" and .level == "error")'
```

### Debugging with Logs

**Trace a specific request:**
```bash
# 1. Get request ID from application logs or response headers
REQUEST_ID="550e8400-e29b-41d4-a716-446655440000"

# 2. Find all logs for this request
cat logs/app.log | jq "select(.requestId == \"$REQUEST_ID\")"

# 3. Sort by timestamp to see request flow
cat logs/app.log | \
  jq "select(.requestId == \"$REQUEST_ID\")" | \
  jq -s 'sort_by(.timestamp)'
```

**Debug slow query:**
```bash
# 1. Find slow query logs
cat logs/app.log | jq 'select(.msg == "Slow database query detected")'

# 2. Get query details
cat logs/app.log | \
  jq 'select(.msg == "Slow database query detected") | {query, duration, requestId}'

# 3. Trace request that triggered slow query
cat logs/app.log | jq "select(.requestId == \"<requestId-from-step-2>\")"
```

**Find memory/performance issues:**
```bash
# Memory warnings
cat logs/app.log | jq 'select(.msg | contains("Memory"))'

# CPU warnings
cat logs/app.log | jq 'select(.msg | contains("CPU"))'

# Performance issues
cat logs/app.log | jq 'select(.msg | contains("Slow") or .msg | contains("Performance"))'
```

### Integration with Log Aggregation Systems

**Elasticsearch/ELK Stack:**
```bash
# Configure Filebeat to ship logs to Elasticsearch
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/builder-api/*.log
    json.keys_under_root: true
    json.add_error_key: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "builder-api-%{+yyyy.MM.dd}"
```

**Datadog:**
```bash
# Use Datadog agent with source configuration
# datadog.yaml
logs:
  - type: file
    path: /var/log/builder-api/*.log
    service: builder-api
    source: nodejs
    sourcecategory: sourcecode
```

**Splunk:**
```bash
# Configure Splunk forwarder
# inputs.conf
[monitor:///var/log/builder-api/*.log]
disabled = false
sourcetype = _json
index = builder-api
```

**CloudWatch (AWS):**
```bash
# Use CloudWatch Logs agent
# awslogs.conf
[/var/log/builder-api/app.log]
datetime_format = %Y-%m-%dT%H:%M:%S
file = /var/log/builder-api/app.log
buffer_duration = 5000
log_stream_name = {instance_id}
initial_position = start_of_file
log_group_name = /aws/builder-api
```

### Best Practices

**DO:**
- ✅ Use correlation IDs to track requests across services
- ✅ Log at appropriate levels (avoid excessive debug logs in production)
- ✅ Include context (user ID, request ID) in all logs
- ✅ Use structured logging (JSON) in production
- ✅ Redact sensitive information (passwords, tokens)
- ✅ Log business events for analytics
- ✅ Monitor log volume and set up alerts

**DON'T:**
- ❌ Log sensitive data (passwords, tokens, PII)
- ❌ Use console.log (use logging service)
- ❌ Log at debug level in production
- ❌ Create log files manually
- ❌ Forget to rotate logs
- ❌ Ignore log aggregation in production

### Performance Considerations

**Log Sampling:**
For high-traffic endpoints, consider sampling:
```typescript
// Log only 10% of successful requests
if (statusCode < 400 || Math.random() < 0.1) {
  logger.info('Request completed', context);
}
```

**Async Logging:**
Pino uses async logging by default for better performance. No additional configuration needed.

**Log Rotation:**
Configure log rotation to prevent disk space issues:
```bash
# Using logrotate
# /etc/logrotate.d/builder-api
/var/log/builder-api/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 node node
    sharedscripts
    postrotate
        systemctl reload builder-api
    endscript
}
```

### Troubleshooting Logging Issues

**No logs appearing:**
1. Check LOG_LEVEL environment variable
2. Verify log file permissions
3. Check if logs are being buffered
4. Ensure logging module is imported

**Too many logs:**
1. Increase LOG_LEVEL (e.g., from debug to info)
2. Enable LOG_SKIP_HEALTH_CHECK
3. Implement log sampling for high-traffic endpoints

**Missing context (requestId/correlationId):**
1. Verify middleware is applied to all routes
2. Check AsyncLocalStorage is working
3. Ensure middleware order is correct

**Sensitive data in logs:**
1. Verify LOG_REDACT_SENSITIVE=true
2. Add additional fields to SENSITIVE_FIELDS constant
3. Review log output manually

---

## Common Debugging Steps

### API Not Starting

1. **Check Node version**
```bash
node --version  # Should be 18.x or higher
```

2. **Check port availability**
```bash
lsof -i :3000  # Check if port 3000 is in use
# Kill process if needed
kill -9 <PID>
```

3. **Check database connection**
```bash
psql $DATABASE_URL -c "SELECT 1"
```

4. **Review logs**
```bash
# Check application logs
tail -f logs/app.log

# Check error logs
tail -f logs/error.log
```

### Database Connection Issues

1. **Verify PostgreSQL is running**
```bash
pg_isready
# Or
brew services list | grep postgresql
```

2. **Test connection string**
```bash
psql $DATABASE_URL
```

3. **Check database exists**
```bash
psql -l | grep bobbuilder
```

4. **Check permissions**
```bash
# Connect to database
psql $DATABASE_URL

# Check user permissions
\du
```

### Performance Issues

1. **Check database query performance**
```sql
-- Enable query logging in PostgreSQL
ALTER DATABASE bobbuilder SET log_statement = 'all';
ALTER DATABASE bobbuilder SET log_min_duration_statement = 100;

-- View slow queries
SELECT * FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

2. **Monitor API response times**
```bash
# Check application metrics (if monitoring is set up)
curl http://localhost:3000/metrics

# Use Apache Bench for load testing
ab -n 1000 -c 10 http://localhost:3000/api/health
```

3. **Review Redis cache hit rate**
```bash
redis-cli info stats | grep keyspace
redis-cli --stat
```

### Memory Leaks

```bash
# Run with Node.js heap profiler
node --inspect --heap-prof src/index.js

# Or use clinic.js
npx clinic doctor -- node src/index.js

# Monitor memory usage
ps aux | grep node
```

---

## Monitoring and Alerting

### Health Checks

```bash
# API health endpoint
curl http://localhost:3000/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-11-06T12:00:00Z",
  "uptime": 3600,
  "database": "connected",
  "redis": "connected",
  "version": "0.1.0"
}
```

### Key Metrics to Monitor

**Application Metrics:**
- Request rate (requests per second)
- Response time (p50, p95, p99)
- Error rate (4xx and 5xx responses)
- Active connections

**Database Metrics:**
- Connection pool usage
- Query execution time
- Slow queries (> 100ms)
- Deadlocks and conflicts

**System Metrics:**
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| API p95 response time | > 300ms | > 500ms |
| Error rate | > 0.5% | > 1% |
| Database connection pool | > 70% | > 85% |
| Memory usage | > 75% | > 85% |
| CPU usage | > 70% | > 85% |

---

## Incident Response Procedures

### P1: Critical Outage (Service Down)

**Immediate Actions:**
1. Check service status: `pm2 status` or `systemctl status builder-api`
2. Review recent logs: `tail -f logs/error.log`
3. Check database connectivity
4. Verify external dependencies (Redis, third-party APIs)

**Communication:**
- Post incident in #incidents Slack channel
- Update status page
- Notify stakeholders

**Resolution:**
- Restart service if safe to do so
- Rollback recent deployment if caused by code change
- Scale up resources if under heavy load

**Post-Incident:**
- Document root cause
- Create post-mortem
- Implement preventive measures

### P2: Degraded Performance

**Investigation:**
1. Check APM for slow endpoints
2. Review database slow query log
3. Monitor resource utilization
4. Check for external API issues

**Mitigation:**
- Enable/increase caching
- Scale horizontally if needed
- Optimize slow queries
- Add database indexes

### P3: Non-Critical Issues

**Process:**
1. Document issue with reproduction steps
2. Create ticket with appropriate priority
3. Assign to team member
4. Set expected resolution time

---

## Deployment

### Pre-Deployment Checklist

- [ ] All tests passing (`npm test`)
- [ ] Code reviewed and approved
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Changelog updated
- [ ] Documentation updated

### Staging Deployment

```bash
# Tag release
git tag -a v1.0.0-staging -m "Staging release v1.0.0"
git push origin v1.0.0-staging

# Deploy via CI/CD or manually
npm run deploy:staging
```

### Production Deployment

```bash
# Tag release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Deploy via CI/CD or manually
npm run deploy:production

# Monitor deployment
npm run logs:production
```

### Rollback Procedure

```bash
# Rollback to previous version
kubectl rollout undo deployment/builder-api

# Or rollback to specific version
kubectl rollout undo deployment/builder-api --to-revision=2

# Verify rollback
kubectl rollout status deployment/builder-api
```

---

## Database Maintenance

### Regular Maintenance Tasks

**Daily:**
```bash
# Check database size
psql $DATABASE_URL -c "
  SELECT pg_size_pretty(pg_database_size('bobbuilder'));"

# Check connection count
psql $DATABASE_URL -c "
  SELECT count(*) FROM pg_stat_activity;"
```

**Weekly:**
```bash
# Vacuum analyze
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Check for bloat
psql $DATABASE_URL -f scripts/check_bloat.sql
```

**Monthly:**
```bash
# Full vacuum (during maintenance window)
psql $DATABASE_URL -c "VACUUM FULL ANALYZE;"

# Reindex
psql $DATABASE_URL -c "REINDEX DATABASE bobbuilder;"
```

### Index Management

```sql
-- Find missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public';

-- Create index
CREATE INDEX CONCURRENTLY idx_projects_status
ON projects(status)
WHERE deleted_at IS NULL;
```

---

## Security Operations

### Rotating Secrets

```bash
# Generate new JWT secret
openssl rand -base64 32

# Update in environment
# Update .env or secrets manager
# Restart application
pm2 restart builder-api
```

### Checking for Vulnerabilities

```bash
# npm audit
npm audit

# Fix vulnerabilities
npm audit fix

# Generate security report
npm audit --json > security-report.json
```

### Reviewing Access Logs

```bash
# Check for suspicious activity
grep "401\|403\|429" logs/access.log | tail -100

# Check for SQL injection attempts
grep -i "select\|union\|drop\|insert" logs/access.log

# Monitor failed login attempts
grep "login failed" logs/app.log | wc -l
```

---

## Useful Commands

### Application Management

```bash
# View logs
npm run logs

# Tail logs in real-time
npm run logs:follow

# Run database console
npm run db:console

# Check code style
npm run lint

# Run tests with coverage
npm run test:coverage

# Generate API documentation
npm run docs:generate
```

### Database Commands

```bash
# Connect to database
psql $DATABASE_URL

# List tables
\dt

# Describe table
\d+ table_name

# Show running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active';

# Kill long-running query
SELECT pg_terminate_backend(pid);
```

### Process Management

```bash
# Using PM2
pm2 start ecosystem.config.js
pm2 restart builder-api
pm2 stop builder-api
pm2 logs builder-api
pm2 monit

# Using systemd
systemctl start builder-api
systemctl stop builder-api
systemctl restart builder-api
systemctl status builder-api
journalctl -u builder-api -f
```

---

## Performance Tuning

### Node.js Optimization

```bash
# Increase max memory
node --max-old-space-size=4096 src/index.js

# Enable HTTP/2
# (configure in Express)

# Use cluster mode
pm2 start src/index.js -i max
```

### Database Optimization

```sql
-- Update statistics
ANALYZE;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Increase shared buffers (postgresql.conf)
shared_buffers = 256MB
effective_cache_size = 1GB
```

### Caching Strategy

```javascript
// Redis caching
const cacheKey = `projects:${userId}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const data = await db.query('SELECT * FROM projects WHERE user_id = $1', [userId]);
await redis.setex(cacheKey, 3600, JSON.stringify(data));

return data;
```

---

## Backup and Disaster Recovery

### Backup Schedule

- **Hourly:** Transaction log backups
- **Daily:** Full database backups (retained 7 days)
- **Weekly:** Full backups (retained 4 weeks)
- **Monthly:** Full backups (retained 12 months)

### Recovery Procedures

**Point-in-Time Recovery:**
```bash
# Restore to specific point in time
pg_restore -d bobbuilder_restore backup.dump

# Apply transaction logs up to specific time
pg_restore -t "2024-11-06 12:00:00" backup.dump
```

**Testing Recovery:**
```bash
# Monthly recovery drill
# 1. Create test database
createdb bobbuilder_test

# 2. Restore latest backup
pg_restore -d bobbuilder_test latest_backup.dump

# 3. Verify data integrity
psql bobbuilder_test -c "SELECT count(*) FROM projects;"

# 4. Document recovery time
```

### Recovery Time Objectives

- **RTO (Recovery Time Objective):** 4 hours
- **RPO (Recovery Point Objective):** 1 hour
- **Maximum Tolerable Downtime:** 8 hours

---

## Useful Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Redis Documentation](https://redis.io/documentation)
