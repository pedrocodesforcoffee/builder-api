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
