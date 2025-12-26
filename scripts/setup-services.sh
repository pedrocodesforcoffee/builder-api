#!/bin/bash

##############################################################################
# Development Services Setup Script
# Starts Redis, ClamAV, and LocalStack S3 using Docker Compose
##############################################################################

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "======================================"
echo "Starting Development Services"
echo "======================================"
echo ""

cd "$(dirname "$0")/.."

# Check if docker-compose exists
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed!"
    echo "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
fi

print_info "Starting services with Docker Compose..."
docker-compose -f docker-compose.dev.yml up -d

echo ""
print_info "Waiting for services to be healthy..."
sleep 5

# Check Redis
print_info "Checking Redis..."
if docker-compose -f docker-compose.dev.yml ps redis | grep -q "Up"; then
    print_success "Redis is running on localhost:6379"
else
    print_warn "Redis may still be starting..."
fi

# Check LocalStack
print_info "Checking LocalStack..."
if docker-compose -f docker-compose.dev.yml ps localstack | grep -q "Up"; then
    print_success "LocalStack is running on localhost:4566"
else
    print_warn "LocalStack may still be starting..."
fi

# Check ClamAV
print_info "Checking ClamAV..."
if docker-compose -f docker-compose.dev.yml ps clamav | grep -q "Up"; then
    print_success "ClamAV is running on localhost:3310"
    print_warn "Note: ClamAV takes 3-4 minutes to fully initialize (downloading virus definitions)"
else
    print_warn "ClamAV may still be starting..."
fi

echo ""
print_info "Waiting 30 seconds for LocalStack to fully initialize..."
sleep 30

# Create S3 buckets
print_info "Creating S3 buckets..."

if command -v aws &> /dev/null; then
    AWS_ENDPOINT="--endpoint-url=http://localhost:4566"

    aws $AWS_ENDPOINT s3 mb s3://builder-uploads-quarantine-dev --region us-east-1 2>&1 | grep -v "BucketAlreadyOwnedByYou" || true
    aws $AWS_ENDPOINT s3 mb s3://builder-documents-dev --region us-east-1 2>&1 | grep -v "BucketAlreadyOwnedByYou" || true

    print_info "S3 buckets:"
    aws $AWS_ENDPOINT s3 ls
    print_success "S3 buckets created"
else
    print_warn "AWS CLI not installed, skipping bucket creation"
    print_info "Install AWS CLI: brew install awscli"
    print_info "Then run: ./scripts/create-s3-buckets.sh"
fi

echo ""
echo "======================================"
print_success "Services Started!"
echo "======================================"
echo ""
echo "Running services:"
echo "  ✅ Redis       - localhost:6379"
echo "  ✅ LocalStack  - localhost:4566"
echo "  ✅ ClamAV      - localhost:3310 (takes 3-4 min to fully start)"
echo ""
echo "To view logs:"
echo "  docker-compose -f docker-compose.dev.yml logs -f"
echo ""
echo "To stop services:"
echo "  docker-compose -f docker-compose.dev.yml down"
echo ""
echo "Next steps:"
echo "  1. Update .env file with service URLs"
echo "  2. Run: npm install"
echo "  3. Run: npm run start:dev"
echo ""
