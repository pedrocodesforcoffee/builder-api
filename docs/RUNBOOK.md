# Runbook - Builder API Operations Guide

## Local Development Setup

### Prerequisites
1. Install Node.js 18+ from https://nodejs.org/
2. Install PostgreSQL 14+ from https://www.postgresql.org/download/
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
# Create database
createdb bobbuilder

# Run migrations
npm run migrate

# Seed test data (optional)
npm run seed
```

4. **Start Development Server**
```bash
npm run dev
```

The API should now be running at http://localhost:3000

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment name | `development`, `staging`, `production` |
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/bobbuilder` |
| `JWT_SECRET` | Secret key for JWT signing | Generate with `openssl rand -base64 32` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `LOG_LEVEL` | Logging level | `debug`, `info`, `warn`, `error` |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |

---

## Database Management

### Migrations

```bash
# Create a new migration
npm run migrate:create -- migration_name

# Run all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Check migration status
npm run migrate:status
```

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
pg_dump -Fc $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).dump

# Restore from backup
pg_restore -d $DATABASE_URL backup_file.dump

# Backup to S3 (production)
pg_dump -Fc $DATABASE_URL | aws s3 cp - s3://backups/db_$(date +%Y%m%d).dump
```

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
