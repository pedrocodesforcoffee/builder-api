#!/bin/bash

# Submittal Workflow Engine - Comprehensive Testing Script
# This script tests all major endpoints of the workflow engine

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000/api/v1}"
TOKEN="${TOKEN:-}"
PROJECT_ID="${PROJECT_ID:-}"

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_test() {
    echo -e "${YELLOW}TEST $((TESTS_TOTAL + 1)): $1${NC}"
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

print_success() {
    echo -e "${GREEN}✓ PASS: $1${NC}\n"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

print_error() {
    echo -e "${RED}✗ FAIL: $1${NC}\n"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

check_response() {
    local response="$1"
    local expected_status="$2"
    local test_name="$3"

    local status=$(echo "$response" | grep "HTTP" | awk '{print $2}')

    if [ "$status" == "$expected_status" ]; then
        print_success "$test_name (Status: $status)"
        return 0
    else
        print_error "$test_name (Expected: $expected_status, Got: $status)"
        echo "$response"
        return 1
    fi
}

make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"

    if [ -z "$data" ]; then
        curl -s -i -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            "$API_URL$endpoint"
    else
        curl -s -i -X "$method" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint"
    fi
}

# Check prerequisites
if [ -z "$TOKEN" ]; then
    echo -e "${RED}Error: TOKEN environment variable not set${NC}"
    echo "Usage: TOKEN=your_jwt_token PROJECT_ID=your_project_id ./test-submittal-workflow.sh"
    exit 1
fi

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}Error: PROJECT_ID environment variable not set${NC}"
    echo "Usage: TOKEN=your_jwt_token PROJECT_ID=your_project_id ./test-submittal-workflow.sh"
    exit 1
fi

echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Submittal Workflow Engine - Testing Suite       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo "API URL: $API_URL"
echo "Project ID: $PROJECT_ID"
echo ""

# Store IDs for later tests
TEMPLATE_ID=""
SUBMITTAL_ID=""
STEP_ID=""
DISTRIBUTION_ID=""
LEAD_TIME_CONFIG_ID=""

# ============================================
# PART 1: WORKFLOW TEMPLATES
# ============================================

print_header "PART 1: Workflow Template Management"

# Test 1: Create Workflow Template
print_test "Create workflow template with 3 sequential steps"
RESPONSE=$(make_request "POST" "/projects/$PROJECT_ID/submittals/workflow/templates" '{
  "name": "Test Standard Review",
  "description": "3-step review process for testing",
  "applicableTypes": ["PRODUCT_DATA", "SHOP_DRAWING"],
  "specSectionPatterns": ["03*", "05*"],
  "totalReviewDays": 21,
  "autoApply": true,
  "priority": 10,
  "steps": [
    {
      "name": "GC Review",
      "stepType": "REVIEW",
      "stepOrder": 1,
      "routingType": "SERIAL",
      "reviewerType": "USER",
      "allowedDays": 3,
      "canApprove": true,
      "canReject": true
    },
    {
      "name": "Architect Review",
      "stepType": "APPROVAL",
      "stepOrder": 2,
      "routingType": "SERIAL",
      "reviewerType": "ROLE",
      "reviewerRole": "ARCHITECT",
      "allowedDays": 14,
      "canApprove": true,
      "canReject": true
    },
    {
      "name": "Engineer Review",
      "stepType": "APPROVAL",
      "stepOrder": 3,
      "routingType": "SERIAL",
      "reviewerType": "ROLE",
      "reviewerRole": "ENGINEER",
      "allowedDays": 4,
      "canApprove": true,
      "canReject": true
    }
  ]
}')

if check_response "$RESPONSE" "201" "Create workflow template"; then
    TEMPLATE_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  Template ID: $TEMPLATE_ID"
fi

# Test 2: Get All Templates
print_test "Get all workflow templates for project"
RESPONSE=$(make_request "GET" "/projects/$PROJECT_ID/submittals/workflow/templates" "")
check_response "$RESPONSE" "200" "Get all templates"

# Test 3: Get Single Template
if [ -n "$TEMPLATE_ID" ]; then
    print_test "Get workflow template by ID"
    RESPONSE=$(make_request "GET" "/projects/$PROJECT_ID/submittals/workflow/templates/$TEMPLATE_ID" "")
    check_response "$RESPONSE" "200" "Get template by ID"
fi

# Test 4: Update Template
if [ -n "$TEMPLATE_ID" ]; then
    print_test "Update workflow template"
    RESPONSE=$(make_request "PUT" "/projects/$PROJECT_ID/submittals/workflow/templates/$TEMPLATE_ID" '{
      "description": "Updated description for testing",
      "priority": 20
    }')
    check_response "$RESPONSE" "200" "Update template"
fi

# Test 5: Find Applicable Template
print_test "Find applicable template by type and spec section"
RESPONSE=$(make_request "GET" "/projects/$PROJECT_ID/submittals/workflow/templates/find/applicable?submittalType=PRODUCT_DATA&specSection=03 30 00" "")
check_response "$RESPONSE" "200" "Find applicable template"

# ============================================
# PART 2: WORKFLOW EXECUTION
# ============================================

print_header "PART 2: Workflow Execution"

# Note: These tests assume you have a submittal in your database
# You'll need to create a submittal first or use an existing SUBMITTAL_ID

echo -e "${YELLOW}NOTE: Workflow execution tests require an existing submittal${NC}"
echo -e "${YELLOW}Please set SUBMITTAL_ID environment variable to test workflow execution${NC}"
echo ""

if [ -n "$SUBMITTAL_ID" ] && [ -n "$TEMPLATE_ID" ]; then
    # Test 6: Apply Template to Submittal
    print_test "Apply workflow template to submittal"
    RESPONSE=$(make_request "POST" "/projects/$PROJECT_ID/submittals/workflow/$SUBMITTAL_ID/apply-template/$TEMPLATE_ID" "")

    if check_response "$RESPONSE" "201" "Apply template to submittal"; then
        STEP_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "  Step ID: $STEP_ID"
    fi

    # Test 7: Get Workflow Steps
    print_test "Get workflow steps for submittal"
    RESPONSE=$(make_request "GET" "/projects/$PROJECT_ID/submittals/workflow/$SUBMITTAL_ID/steps" "")
    check_response "$RESPONSE" "200" "Get workflow steps"

    # Test 8: Get Workflow Summary
    print_test "Get workflow execution summary"
    RESPONSE=$(make_request "GET" "/projects/$PROJECT_ID/submittals/workflow/$SUBMITTAL_ID/summary" "")
    check_response "$RESPONSE" "200" "Get workflow summary"

    # Test 9: Get Single Step
    if [ -n "$STEP_ID" ]; then
        print_test "Get workflow step by ID"
        RESPONSE=$(make_request "GET" "/projects/$PROJECT_ID/submittals/workflow/steps/$STEP_ID" "")
        check_response "$RESPONSE" "200" "Get step by ID"
    fi

    # Test 10: Complete Workflow Step
    if [ -n "$STEP_ID" ]; then
        print_test "Complete workflow step"
        RESPONSE=$(make_request "POST" "/projects/$PROJECT_ID/submittals/workflow/steps/$STEP_ID/complete" '{
          "stamp": "APPROVED",
          "comments": "Test approval - looks good",
          "conditions": "No conditions"
        }')
        check_response "$RESPONSE" "200" "Complete workflow step"
    fi

    # Test 11: Reassign Step
    if [ -n "$STEP_ID" ]; then
        print_test "Reassign workflow step"
        RESPONSE=$(make_request "POST" "/projects/$PROJECT_ID/submittals/workflow/steps/$STEP_ID/reassign" '{
          "newAssigneeId": "user-123",
          "reason": "Original reviewer unavailable"
        }')
        check_response "$RESPONSE" "200" "Reassign step"
    fi

    # Test 12: Cancel Workflow
    print_test "Cancel workflow"
    RESPONSE=$(make_request "POST" "/projects/$PROJECT_ID/submittals/workflow/$SUBMITTAL_ID/cancel" "")
    check_response "$RESPONSE" "204" "Cancel workflow"
else
    echo -e "${YELLOW}Skipping workflow execution tests (no SUBMITTAL_ID provided)${NC}\n"
fi

# ============================================
# PART 3: LEAD TIME MANAGEMENT
# ============================================

print_header "PART 3: Lead Time Management"

# Test 13: Calculate Lead Time
print_test "Calculate lead time for submittal"
RESPONSE=$(make_request "POST" "/projects/$PROJECT_ID/submittals/workflow/lead-time/calculate" '{
  "requiredOnSiteDate": "2024-08-01",
  "specSection": "03 30 00",
  "submittalType": "SHOP_DRAWING"
}')
check_response "$RESPONSE" "200" "Calculate lead time"

# Test 14: Create Lead Time Configuration
print_test "Create lead time configuration"
RESPONSE=$(make_request "POST" "/projects/$PROJECT_ID/submittals/workflow/lead-time/configurations" '{
  "specSection": "05*",
  "fabricationDays": 45,
  "deliveryDays": 15,
  "reviewDays": 14
}')

if check_response "$RESPONSE" "201" "Create lead time configuration"; then
    LEAD_TIME_CONFIG_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  Lead Time Config ID: $LEAD_TIME_CONFIG_ID"
fi

# Test 15: Get All Lead Time Configurations
print_test "Get all lead time configurations"
RESPONSE=$(make_request "GET" "/projects/$PROJECT_ID/submittals/workflow/lead-time/configurations" "")
check_response "$RESPONSE" "200" "Get all lead time configurations"

# Test 16: Update Lead Time Configuration
if [ -n "$LEAD_TIME_CONFIG_ID" ]; then
    print_test "Update lead time configuration"
    RESPONSE=$(make_request "PUT" "/projects/$PROJECT_ID/submittals/workflow/lead-time/configurations/$LEAD_TIME_CONFIG_ID" '{
      "fabricationDays": 50,
      "deliveryDays": 20
    }')
    check_response "$RESPONSE" "200" "Update lead time configuration"
fi

# Test 17: Get Lead Time Warnings
print_test "Get lead time warnings for project"
RESPONSE=$(make_request "GET" "/projects/$PROJECT_ID/submittals/workflow/lead-time/warnings" "")
check_response "$RESPONSE" "200" "Get lead time warnings"

# Test 18: Get Critical Submittals
print_test "Get critical submittals"
RESPONSE=$(make_request "GET" "/projects/$PROJECT_ID/submittals/workflow/lead-time/critical" "")
check_response "$RESPONSE" "200" "Get critical submittals"

# Test 19: Validate Required Date
print_test "Validate required on-site date"
RESPONSE=$(make_request "POST" "/projects/$PROJECT_ID/submittals/workflow/lead-time/validate" '{
  "requiredOnSiteDate": "2024-06-01",
  "specSection": "05 50 00",
  "submittalType": "SHOP_DRAWING"
}')
check_response "$RESPONSE" "200" "Validate required date"

# Test 20: Delete Lead Time Configuration
if [ -n "$LEAD_TIME_CONFIG_ID" ]; then
    print_test "Delete lead time configuration"
    RESPONSE=$(make_request "DELETE" "/projects/$PROJECT_ID/submittals/workflow/lead-time/configurations/$LEAD_TIME_CONFIG_ID" "")
    check_response "$RESPONSE" "204" "Delete lead time configuration"
fi

# ============================================
# PART 4: DISTRIBUTION MANAGEMENT
# ============================================

print_header "PART 4: Distribution Management"

if [ -n "$SUBMITTAL_ID" ]; then
    # Test 21: Distribute Submittal
    print_test "Distribute submittal to recipients"
    RESPONSE=$(make_request "POST" "/projects/$PROJECT_ID/submittals/workflow/$SUBMITTAL_ID/distribute" '{
      "recipientIds": [],
      "externalRecipients": [
        {
          "email": "test@example.com",
          "name": "Test Recipient"
        }
      ],
      "method": "EMAIL",
      "includeConditions": true,
      "coverNote": "Test distribution"
    }')

    if check_response "$RESPONSE" "201" "Distribute submittal"; then
        DISTRIBUTION_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "  Distribution ID: $DISTRIBUTION_ID"
    fi

    # Test 22: Get Distributions for Submittal
    print_test "Get distributions for submittal"
    RESPONSE=$(make_request "GET" "/projects/$PROJECT_ID/submittals/workflow/$SUBMITTAL_ID/distributions" "")
    check_response "$RESPONSE" "200" "Get distributions"

    # Test 23: Get Distribution Summary
    print_test "Get distribution summary"
    RESPONSE=$(make_request "GET" "/projects/$PROJECT_ID/submittals/workflow/$SUBMITTAL_ID/distributions/summary" "")
    check_response "$RESPONSE" "200" "Get distribution summary"

    # Test 24: Acknowledge Distribution
    if [ -n "$DISTRIBUTION_ID" ]; then
        print_test "Acknowledge distribution"
        RESPONSE=$(make_request "POST" "/projects/$PROJECT_ID/submittals/workflow/distributions/$DISTRIBUTION_ID/acknowledge" "")
        check_response "$RESPONSE" "204" "Acknowledge distribution"
    fi

    # Test 25: Resend Distribution
    if [ -n "$DISTRIBUTION_ID" ]; then
        print_test "Resend distribution"
        RESPONSE=$(make_request "POST" "/projects/$PROJECT_ID/submittals/workflow/distributions/$DISTRIBUTION_ID/resend" "")
        check_response "$RESPONSE" "200" "Resend distribution"
    fi

    # Test 26: Get Unacknowledged Distributions
    print_test "Get unacknowledged distributions"
    RESPONSE=$(make_request "GET" "/projects/$PROJECT_ID/submittals/workflow/distributions/unacknowledged" "")
    check_response "$RESPONSE" "200" "Get unacknowledged distributions"

    # Test 27: Delete Distribution
    if [ -n "$DISTRIBUTION_ID" ]; then
        print_test "Delete distribution"
        RESPONSE=$(make_request "DELETE" "/projects/$PROJECT_ID/submittals/workflow/distributions/$DISTRIBUTION_ID" "")
        check_response "$RESPONSE" "204" "Delete distribution"
    fi
else
    echo -e "${YELLOW}Skipping distribution tests (no SUBMITTAL_ID provided)${NC}\n"
fi

# ============================================
# PART 5: SCHEDULER TRIGGERS
# ============================================

print_header "PART 5: Scheduler Triggers (Manual Testing)"

# Test 28: Trigger Overdue Check
print_test "Manually trigger overdue check"
RESPONSE=$(make_request "POST" "/projects/$PROJECT_ID/submittals/workflow/scheduler/check-overdue" "")
check_response "$RESPONSE" "200" "Trigger overdue check"

# Test 29: Trigger Lead Time Warnings
print_test "Manually trigger lead time warnings"
RESPONSE=$(make_request "POST" "/projects/$PROJECT_ID/submittals/workflow/scheduler/check-lead-time" "")
check_response "$RESPONSE" "200" "Trigger lead time warnings"

# ============================================
# CLEANUP (Optional)
# ============================================

print_header "CLEANUP"

# Test 30: Delete Workflow Template
if [ -n "$TEMPLATE_ID" ]; then
    print_test "Delete workflow template (cleanup)"
    RESPONSE=$(make_request "DELETE" "/projects/$PROJECT_ID/submittals/workflow/templates/$TEMPLATE_ID" "")
    check_response "$RESPONSE" "204" "Delete template"
fi

# ============================================
# SUMMARY
# ============================================

print_header "TEST SUMMARY"

echo -e "Total Tests: ${BLUE}$TESTS_TOTAL${NC}"
echo -e "Passed:      ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed:      ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           ALL TESTS PASSED! ✓                      ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║           SOME TESTS FAILED ✗                      ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
