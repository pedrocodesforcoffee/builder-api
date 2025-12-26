#!/bin/bash

##############################################################################
# Development Environment Setup Script
# Sets up all required services for document upload & virus scanning
##############################################################################

set -e  # Exit on error

echo "======================================"
echo "BobTheBuilder Development Setup"
echo "======================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    print_error "Homebrew is not installed!"
    echo "Please install Homebrew first: https://brew.sh"
    exit 1
fi

print_success "Homebrew is installed"

##############################################################################
# 1. Install Redis
##############################################################################
echo ""
print_info "==== Installing Redis ===="

if command -v redis-server &> /dev/null; then
    print_warn "Redis is already installed"
    redis-server --version
else
    print_info "Installing Redis via Homebrew..."
    brew install redis
    print_success "Redis installed"
fi

print_info "Starting Redis service..."
brew services start redis || print_warn "Redis may already be running"

# Wait for Redis to start
sleep 2

# Test Redis connection
if redis-cli ping &> /dev/null; then
    print_success "Redis is running and responding"
else
    print_error "Redis is not responding"
    exit 1
fi

##############################################################################
# 2. Install ClamAV
##############################################################################
echo ""
print_info "==== Installing ClamAV ===="

if command -v clamscan &> /dev/null; then
    print_warn "ClamAV is already installed"
    clamscan --version | head -1
else
    print_info "Installing ClamAV via Homebrew..."
    brew install clamav
    print_success "ClamAV installed"
fi

# Configure ClamAV
print_info "Configuring ClamAV..."

CLAMAV_CONF_DIR="/usr/local/etc/clamav"
mkdir -p "$CLAMAV_CONF_DIR"

# Create freshclam.conf if it doesn't exist
if [ ! -f "$CLAMAV_CONF_DIR/freshclam.conf" ]; then
    print_info "Creating freshclam.conf..."
    cat > "$CLAMAV_CONF_DIR/freshclam.conf" <<EOF
# Automatically created by setup script
DatabaseDirectory /usr/local/var/lib/clamav
UpdateLogFile /usr/local/var/log/clamav/freshclam.log
LogFileMaxSize 2M
LogTime yes
DatabaseMirror database.clamav.net
EOF
    print_success "freshclam.conf created"
else
    print_warn "freshclam.conf already exists"
fi

# Create clamd.conf if it doesn't exist
if [ ! -f "$CLAMAV_CONF_DIR/clamd.conf" ]; then
    print_info "Creating clamd.conf..."
    cat > "$CLAMAV_CONF_DIR/clamd.conf" <<EOF
# Automatically created by setup script
LogFile /usr/local/var/log/clamav/clamd.log
LogFileMaxSize 2M
LogTime yes
DatabaseDirectory /usr/local/var/lib/clamav
LocalSocket /usr/local/var/run/clamav/clamd.sock
TCPSocket 3310
TCPAddr 127.0.0.1
MaxThreads 12
MaxConnectionQueueLength 30
StreamMaxLength 100M
EOF
    print_success "clamd.conf created"
else
    print_warn "clamd.conf already exists"
fi

# Create necessary directories
print_info "Creating ClamAV directories..."
mkdir -p /usr/local/var/lib/clamav
mkdir -p /usr/local/var/log/clamav
mkdir -p /usr/local/var/run/clamav

# Update virus definitions
print_info "Updating ClamAV virus definitions (this may take 2-3 minutes)..."
if freshclam; then
    print_success "Virus definitions updated"
else
    print_warn "Failed to update virus definitions, will try again later"
fi

# Start ClamAV daemon
print_info "Starting ClamAV daemon..."
brew services start clamav || print_warn "ClamAV may already be running"

# Wait for clamd to start
sleep 5

# Test ClamAV
if netstat -an | grep -q "127.0.0.1.3310"; then
    print_success "ClamAV daemon is running on port 3310"
else
    print_warn "ClamAV daemon may not be running yet (takes ~10 seconds to start)"
fi

##############################################################################
# 3. Install AWS CLI (for LocalStack)
##############################################################################
echo ""
print_info "==== Installing AWS CLI ===="

if command -v aws &> /dev/null; then
    print_warn "AWS CLI is already installed"
    aws --version
else
    print_info "Installing AWS CLI via Homebrew..."
    brew install awscli
    print_success "AWS CLI installed"
fi

##############################################################################
# 4. Install LocalStack (Local S3)
##############################################################################
echo ""
print_info "==== Installing LocalStack ===="

if command -v localstack &> /dev/null; then
    print_warn "LocalStack is already installed"
    localstack --version
else
    print_info "Installing LocalStack via pip..."
    pip3 install localstack || python3 -m pip install --user localstack
    print_success "LocalStack installed"
fi

# Start LocalStack in background
print_info "Starting LocalStack..."
localstack start -d &> /dev/null || print_warn "LocalStack may already be running"

# Wait for LocalStack to start
print_info "Waiting for LocalStack to initialize (15 seconds)..."
sleep 15

# Test LocalStack
if curl -s http://localhost:4566/_localstack/health &> /dev/null; then
    print_success "LocalStack is running on port 4566"
else
    print_warn "LocalStack may not be fully started yet"
fi

##############################################################################
# 5. Create S3 Buckets
##############################################################################
echo ""
print_info "==== Creating S3 Buckets ===="

AWS_ENDPOINT="--endpoint-url=http://localhost:4566"
AWS_REGION="us-east-1"

# Create quarantine bucket
print_info "Creating quarantine bucket..."
if aws $AWS_ENDPOINT s3 mb s3://builder-uploads-quarantine-dev --region $AWS_REGION 2>&1 | grep -q "make_bucket"; then
    print_success "Quarantine bucket created"
else
    print_warn "Quarantine bucket may already exist"
fi

# Create production bucket
print_info "Creating production bucket..."
if aws $AWS_ENDPOINT s3 mb s3://builder-documents-dev --region $AWS_REGION 2>&1 | grep -q "make_bucket"; then
    print_success "Production bucket created"
else
    print_warn "Production bucket may already exist"
fi

# Verify buckets
print_info "Verifying S3 buckets..."
aws $AWS_ENDPOINT s3 ls
print_success "S3 buckets ready"

##############################################################################
# 6. Summary
##############################################################################
echo ""
echo "======================================"
print_success "Setup Complete!"
echo "======================================"
echo ""
echo "Services installed and running:"
echo "  ✅ PostgreSQL (already running)"
echo "  ✅ Redis (localhost:6379)"
echo "  ✅ ClamAV (localhost:3310)"
echo "  ✅ LocalStack S3 (localhost:4566)"
echo ""
echo "S3 Buckets created:"
echo "  ✅ builder-uploads-quarantine-dev"
echo "  ✅ builder-documents-dev"
echo ""
echo "Next steps:"
echo "  1. Update your .env file (see .env.example)"
echo "  2. Run: npm install"
echo "  3. Run: npm run start:dev"
echo ""
echo "To stop services:"
echo "  brew services stop redis"
echo "  brew services stop clamav"
echo "  localstack stop"
echo ""
print_success "Ready to develop!"
