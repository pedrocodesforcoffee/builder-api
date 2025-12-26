# Virus Scanning Setup Guide

Complete guide for setting up and configuring ClamAV virus scanning in the Builder API.

## Table of Contents

1. [Overview](#overview)
2. [Development Setup Options](#development-setup-options)
3. [Mock Mode (Quick Start)](#mock-mode-quick-start)
4. [Full Mode (Production-Ready)](#full-mode-production-ready)
5. [Testing](#testing)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Builder API includes comprehensive virus scanning using **ClamAV**, an open-source antivirus engine.

### Key Features:
- ✅ **Free & Open Source** - No licensing costs
- ✅ **Quarantine-First Architecture** - Files uploaded to quarantine bucket first
- ✅ **Background Processing** - Async scanning via Bull queue
- ✅ **Graceful Degradation** - Works without ClamAV in development
- ✅ **Production-Ready** - Battle-tested antivirus engine

### How It Works:

```
Upload Flow:
1. File uploads → QUARANTINE bucket (S3)
2. Document status → QUARANTINED
3. Background job → Virus scan via ClamAV
4. If CLEAN → Move to PRODUCTION bucket, status → DRAFT
5. If INFECTED → Delete from quarantine, mark upload FAILED
```

---

## Development Setup Options

You have **three options** for development:

| Option | Complexity | Time to Setup | External Dependencies | Best For |
|--------|------------|---------------|----------------------|----------|
| **Mock Mode** | Low | 0 minutes | None | Quick iteration, CI/CD |
| **Docker Mode** | Medium | 10 minutes | Docker | Full testing locally |
| **Native Mode** | High | 20 minutes | Multiple services | Production-like environment |

---

## Mock Mode (Quick Start)

**Best for:** Quick development, CI/CD pipelines, unit testing

### Setup (0 minutes)

1. **Update `.env`:**
```bash
# Enable mock mode
USE_MOCK_S3=true
SKIP_VIRUS_SCAN=true
```

2. **Start the app:**
```bash
npm run start:dev
```

**That's it!** The app will:
- ✅ Use filesystem storage instead of S3 (stored in `/tmp/builder-s3-mock`)
- ✅ Skip virus scanning (mark as "skipped" in processing status)
- ✅ Work without Redis, LocalStack, or ClamAV
- ✅ Run tests without external dependencies

### What Gets Mocked:

- **S3 Service**: Files stored in `/tmp/builder-s3-mock/{bucket}/{key}`
- **Virus Scanning**: Always marked as "skipped"
- **Processing Pipeline**: Runs but skips ClamAV step

### Limitations:

- ⚠️ Doesn't test actual virus scanning
- ⚠️ Not suitable for testing security flows
- ⚠️ Files stored on local disk (not in S3)

**Use this mode for:**
- ✅ UI development
- ✅ API endpoint testing
- ✅ CI/CD pipelines
- ✅ Unit tests

---

## Full Mode (Production-Ready)

**Best for:** End-to-end testing, pre-production validation

### Option A: Docker Compose (Recommended)

#### Prerequisites:
- Docker 20+ installed
- docker-compose 1.29+ installed

#### Setup (10 minutes):

1. **Start all services:**
```bash
# Use modern docker-compose file format
docker-compose -f docker-compose.full.yml up -d
```

Or manually:

```bash
# Start Redis
docker run -d --name builder-redis -p 6379:6379 redis:7-alpine

# Start ClamAV (takes 3-4 minutes to download virus definitions)
docker run -d --name builder-clamav -p 3310:3310 clamav/clamav:latest

# Start LocalStack (local S3)
docker run -d --name builder-localstack -p 4566:4566 localstack/localstack:latest
```

2. **Wait for ClamAV to initialize (~3-4 minutes):**
```bash
# Watch logs
docker logs -f builder-clamav

# Wait for: "clamd is ready"
```

3. **Create S3 buckets:**
```bash
# Install AWS CLI if needed
pip install awscli-local

# Create buckets
awslocal s3 mb s3://builder-uploads-quarantine-dev
awslocal s3 mb s3://builder-documents-dev

# Verify
awslocal s3 ls
```

4. **Update `.env`:**
```bash
# Disable mocks
USE_MOCK_S3=false
SKIP_VIRUS_SCAN=false

# S3 Configuration (LocalStack)
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
AWS_ENDPOINT=http://localhost:4566
S3_QUARANTINE_BUCKET=builder-uploads-quarantine-dev
S3_DOCUMENTS_BUCKET=builder-documents-dev

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# ClamAV Configuration
CLAMAV_HOST=localhost
CLAMAV_PORT=3310
```

5. **Start the app:**
```bash
npm run start:dev
```

#### Verify Setup:

```bash
# Check Redis
redis-cli ping
# Should output: PONG

# Check ClamAV
netstat -an | grep 3310
# Should show: tcp4  0  0  127.0.0.1.3310  *.*  LISTEN

# Check LocalStack
curl http://localhost:4566/_localstack/health
# Should return JSON with S3 status

# Check S3 buckets
awslocal s3 ls
# Should show both buckets
```

---

### Option B: Native Installation (macOS/Linux)

#### Prerequisites:
- Homebrew (macOS) or apt (Linux)

#### Setup (20 minutes):

**macOS:**
```bash
# Install Redis
brew install redis
brew services start redis

# Install ClamAV
brew install clamav

# Configure ClamAV
mkdir -p /usr/local/etc/clamav
cat > /usr/local/etc/clamav/freshclam.conf <<EOF
DatabaseDirectory /usr/local/var/lib/clamav
UpdateLogFile /usr/local/var/log/clamav/freshclam.log
DatabaseMirror database.clamav.net
EOF

# Update virus definitions (takes 2-3 minutes)
freshclam

# Configure clamd
cat > /usr/local/etc/clamav/clamd.conf <<EOF
LogFile /usr/local/var/log/clamav/clamd.log
DatabaseDirectory /usr/local/var/lib/clamav
TCPSocket 3310
TCPAddr 127.0.0.1
MaxThreads 12
StreamMaxLength 100M
EOF

# Start ClamAV daemon
brew services start clamav

# Install LocalStack
pip3 install localstack localstack-client awscli-local

# Start LocalStack
localstack start -d

# Wait 30 seconds for LocalStack to initialize
sleep 30

# Create S3 buckets
awslocal s3 mb s3://builder-uploads-quarantine-dev
awslocal s3 mb s3://builder-documents-dev
```

**Linux (Ubuntu/Debian):**
```bash
# Install Redis
sudo apt-get install redis-server
sudo systemctl start redis

# Install ClamAV
sudo apt-get install clamav clamav-daemon

# Update virus definitions
sudo freshclam

# Configure ClamAV
sudo systemctl start clamav-daemon

# Install LocalStack
pip3 install localstack awscli-local
localstack start -d

# Wait and create buckets
sleep 30
awslocal s3 mb s3://builder-uploads-quarantine-dev
awslocal s3 mb s3://builder-documents-dev
```

---

## Testing

### Unit Tests (No External Dependencies)

```bash
# Uses mocks automatically
npm run test

# Specific test file
npm run test virus-scan.processor.spec
```

### Integration Tests (Requires Services)

```bash
# Start services first
docker-compose -f docker-compose.full.yml up -d

# Wait for ClamAV to initialize
sleep 180

# Run integration tests
npm run test:e2e document-upload.e2e-spec

# Test virus scanning specifically
npm run test:e2e -- --grep "virus"
```

### Manual Testing

#### Test 1: Upload Clean File

```bash
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/documents/initiate-upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "clean-file.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "checksum": "abc123"
  }'

# Get upload ID from response, then check status:
curl http://localhost:3000/api/projects/PROJECT_ID/documents/uploads/UPLOAD_ID/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# Wait 5-10 seconds, check again
# Should show: processingStatus.virusScan.status = "completed"
# Should show: processingStatus.virusScan.clean = true
```

#### Test 2: Upload EICAR Test File (Safe Virus Test)

```bash
# Download EICAR test file (safe, not a real virus)
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt

# Upload it
# ... same process as above ...

# Check status
# Should show: processingStatus.virusScan.status = "failed"
# Should show: error = "Virus detected: EICAR-Test-File"
```

---

## Production Deployment

### AWS EC2 Setup

```bash
# On EC2 instance

# Install ClamAV
sudo yum install clamav clamav-daemon  # Amazon Linux
# OR
sudo apt-get install clamav clamav-daemon  # Ubuntu

# Update virus definitions
sudo freshclam

# Configure clamd for TCP
sudo nano /etc/clamd.d/scan.conf
# Add:
TCPSocket 3310
TCPAddr 127.0.0.1

# Start ClamAV
sudo systemctl enable clamav-daemon
sudo systemctl start clamav-daemon

# Install Redis
sudo yum install redis  # Amazon Linux
sudo systemctl enable redis
sudo systemctl start redis
```

### Environment Variables (Production)

```bash
# Use real AWS S3
USE_MOCK_S3=false
SKIP_VIRUS_SCAN=false

# AWS S3 (IAM role recommended)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_QUARANTINE_BUCKET=builder-uploads-quarantine-prod
S3_DOCUMENTS_BUCKET=builder-documents-prod

# Redis
REDIS_HOST=your-redis-cluster.cache.amazonaws.com
REDIS_PORT=6379

# ClamAV
CLAMAV_HOST=localhost  # If on same EC2
CLAMAV_PORT=3310
```

### Resource Requirements

**ClamAV:**
- RAM: 1-2GB
- CPU: 1-2 cores
- Disk: 500MB (virus definitions)
- Updates: 200MB/day (new virus definitions)

**Recommendations:**
- Use t3.medium or larger EC2 instances
- OR run ClamAV on separate micro instance
- Auto-update virus definitions daily (freshclam cron job)

---

## Troubleshooting

### ClamAV Not Starting

**Issue:** ClamAV takes 3-4 minutes to start

**Solution:** Wait for virus definitions to download
```bash
# Check logs
docker logs -f builder-clamav

# Wait for: "clamd is ready"
```

---

### Virus Scan Always Skipped

**Issue:** `processingStatus.virusScan.status = "skipped"`

**Solution:** Check environment variables
```bash
# Should be false in .env
SKIP_VIRUS_SCAN=false

# Check ClamAV is running
netstat -an | grep 3310

# Check backend logs
# Should NOT see: "ClamAV not available, virus scanning will be skipped"
```

---

### S3 Upload Fails

**Issue:** Upload fails with S3 error

**Solution:**
1. Check LocalStack is running:
```bash
curl http://localhost:4566/_localstack/health
```

2. Check buckets exist:
```bash
awslocal s3 ls
```

3. Recreate buckets if needed:
```bash
awslocal s3 mb s3://builder-uploads-quarantine-dev
awslocal s3 mb s3://builder-documents-dev
```

---

### Redis Connection Failed

**Issue:** Bull queue not processing

**Solution:**
1. Check Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

2. Check connection string in .env:
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
```

3. Restart Redis:
```bash
docker restart builder-redis
# OR
brew services restart redis
```

---

## Summary

### Quick Decision Matrix:

**Developing UI/API?** → Use **Mock Mode**
- Zero setup, instant start
- `USE_MOCK_S3=true, SKIP_VIRUS_SCAN=true`

**Testing Upload Flow?** → Use **Docker Mode**
- Full feature testing
- Real S3, ClamAV, Redis via Docker
- 10-minute setup

**Pre-Production Testing?** → Use **Full Mode**
- Native installation
- Matches production environment
- 20-minute setup

**Production Deployment?** → Follow **Production Setup**
- Real AWS S3
- EC2-hosted ClamAV
- Redis cluster

---

## Cost Summary

| Component | Development | Production |
|-----------|-------------|------------|
| ClamAV | **FREE** | **FREE** |
| LocalStack | **FREE** | N/A |
| Real S3 | N/A | $0.023/GB |
| EC2 (ClamAV) | N/A | ~$15-30/month |
| Redis | **FREE** (Docker) | $50-100/month (ElastiCache) |

**Total Development:** **FREE**
**Total Production:** **~$65-130/month**

---

**Last Updated:** 2025-11-28
**Status:** ✅ Fully Implemented & Tested
