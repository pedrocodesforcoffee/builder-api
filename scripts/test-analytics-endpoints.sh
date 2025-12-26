#!/bin/bash

# ============================================================
# RFI & Submittal Analytics Endpoint Testing Script
# ============================================================
# This script tests all 25+ analytics endpoints
#
# Usage:
#   ./scripts/test-analytics-endpoints.sh
#   ./scripts/test-analytics-endpoints.sh rfi_summary    # Test specific endpoint
#
# Prerequisites:
#   - API server running on http://localhost:3000
#   - Valid JWT token set in TOKEN environment variable
#   - Project with RFI and Submittal data seeded
# ============================================================

set -e

# Configuration
API_URL="${API_URL:-http://localhost:3000/api/v1}"
PROJECT_ID="${PROJECT_ID:-a6074e71-6f3f-40c0-a201-1e87b238df81}"
TOKEN="${TOKEN}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test results storage
REPORT_ID=""
SNAPSHOT_ID_1=""
SNAPSHOT_ID_2=""

# ============================================================
# Helper Functions
# ============================================================

print_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_test() {
  echo ""
  echo -e "${YELLOW}▶ TEST: $1${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
  ((PASSED_TESTS++))
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
  ((FAILED_TESTS++))
}

check_prerequisites() {
  print_header "CHECKING PREREQUISITES"

  if [ -z "$TOKEN" ]; then
    echo -e "${RED}ERROR: TOKEN environment variable not set${NC}"
    echo "Please set TOKEN with a valid JWT token:"
    echo "  export TOKEN=\"your-jwt-token\""
    exit 1
  fi

  echo -e "${GREEN}✓ TOKEN is set${NC}"

  # Test API connectivity
  if curl -s -f -o /dev/null "$API_URL/health" 2>/dev/null; then
    echo -e "${GREEN}✓ API is reachable at $API_URL${NC}"
  else
    echo -e "${RED}✗ Cannot reach API at $API_URL${NC}"
    echo "Please ensure the API server is running."
    exit 1
  fi

  echo -e "${GREEN}✓ All prerequisites met${NC}"
}

make_request() {
  local method=$1
  local endpoint=$2
  local data=$3
  local output_file=$4

  ((TOTAL_TESTS++))

  if [ -z "$data" ]; then
    # GET request
    response=$(curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      "$API_URL/projects/$PROJECT_ID$endpoint")
  else
    # POST/PUT/DELETE request with body
    response=$(curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$API_URL/projects/$PROJECT_ID$endpoint")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    if [ -n "$output_file" ]; then
      echo "$body" > "$output_file"
    fi
    return 0
  else
    echo "HTTP $http_code"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    return 1
  fi
}

# ============================================================
# RFI Analytics Tests
# ============================================================

test_rfi_complete_analytics() {
  print_test "Get Complete RFI Analytics"

  if make_request "GET" "/analytics/rfis"; then
    print_success "Retrieved complete RFI analytics"
    echo "$body" | jq '{
      total: .statusSummary.total,
      open: .statusSummary.open,
      overdue: .statusSummary.overdue,
      avgResponseDays: .responseTimeMetrics.averageDays,
      onTimePercentage: .responseTimeMetrics.onTimePercentage,
      totalCostImpact: .impactSummary.totalEstimatedCost
    }'
  else
    print_error "Failed to retrieve RFI analytics"
  fi
}

test_rfi_summary() {
  print_test "Get RFI Status Summary"

  if make_request "GET" "/analytics/rfis/summary"; then
    print_success "Retrieved RFI status summary"
    echo "$body" | jq '{total, open, closed, overdue}'
  else
    print_error "Failed to retrieve RFI summary"
  fi
}

test_rfi_response_time() {
  print_test "Get RFI Response Time Metrics"

  if make_request "GET" "/analytics/rfis/response-time?period=LAST_30_DAYS"; then
    print_success "Retrieved RFI response time metrics"
    echo "$body" | jq '{averageDays, medianDays, onTimePercentage}'
  else
    print_error "Failed to retrieve RFI response time"
  fi
}

test_rfi_aging() {
  print_test "Get RFI Aging Analysis"

  if make_request "GET" "/analytics/rfis/aging"; then
    print_success "Retrieved RFI aging analysis"
    echo "$body" | jq '.buckets[]' | head -20
  else
    print_error "Failed to retrieve RFI aging"
  fi
}

test_rfi_bottlenecks() {
  print_test "Get RFI Bottlenecks"

  if make_request "GET" "/analytics/rfis/bottlenecks"; then
    print_success "Retrieved RFI bottlenecks"
    echo "$body" | jq '.bottlenecks[] | {type, name, openItems, avgDaysOpen}' | head -20
  else
    print_error "Failed to retrieve RFI bottlenecks"
  fi
}

test_rfi_with_filters() {
  print_test "Get RFI Analytics with Filters (OPEN status, HIGH priority)"

  if make_request "GET" "/analytics/rfis?statuses=OPEN,ANSWERED&priorities=HIGH,CRITICAL&period=LAST_90_DAYS"; then
    print_success "Retrieved filtered RFI analytics"
    echo "$body" | jq '.statusSummary'
  else
    print_error "Failed to retrieve filtered RFI analytics"
  fi
}

# ============================================================
# Submittal Analytics Tests
# ============================================================

test_submittal_complete_analytics() {
  print_test "Get Complete Submittal Analytics"

  if make_request "GET" "/analytics/submittals"; then
    print_success "Retrieved complete Submittal analytics"
    echo "$body" | jq '{
      total: .statusSummary.total,
      approved: .statusSummary.approved,
      pending: .statusSummary.submitted + .statusSummary.underReview,
      overdue: .statusSummary.overdue,
      firstTimeApprovalRate: .approvalMetrics.firstTimeApprovalRate,
      avgReviewDays: .reviewTimeMetrics.averageDays
    }'
  else
    print_error "Failed to retrieve Submittal analytics"
  fi
}

test_submittal_summary() {
  print_test "Get Submittal Status Summary"

  if make_request "GET" "/analytics/submittals/summary"; then
    print_success "Retrieved Submittal status summary"
    echo "$body" | jq '{total, submitted, underReview, approved, rejected, overdue}'
  else
    print_error "Failed to retrieve Submittal summary"
  fi
}

test_submittal_approval_metrics() {
  print_test "Get Submittal Approval Metrics"

  if make_request "GET" "/analytics/submittals/approval-metrics?period=LAST_30_DAYS"; then
    print_success "Retrieved Submittal approval metrics"
    echo "$body" | jq '{firstTimeApprovalRate, averageRevisionsPerSubmittal, approvalRate, rejectionRate}'
  else
    print_error "Failed to retrieve Submittal approval metrics"
  fi
}

test_submittal_lead_time() {
  print_test "Get Submittal Lead Time Analysis"

  if make_request "GET" "/analytics/submittals/lead-time"; then
    print_success "Retrieved Submittal lead time analysis"
    echo "$body" | jq '{onTrack, atRisk, late, averageDaysToRequired}'
  else
    print_error "Failed to retrieve Submittal lead time"
  fi
}

test_submittal_by_division() {
  print_test "Get Submittals by Spec Division"

  if make_request "GET" "/analytics/submittals/by-division"; then
    print_success "Retrieved Submittals by spec division"
    echo "$body" | jq '.bySpecDivision[] | {division, name, total, approved, approvalRate}' | head -20
  else
    print_error "Failed to retrieve Submittals by division"
  fi
}

test_submittal_contractor_performance() {
  print_test "Get Contractor Performance Metrics"

  if make_request "GET" "/analytics/submittals/contractor-performance?period=LAST_90_DAYS"; then
    print_success "Retrieved contractor performance metrics"
    echo "$body" | jq '.contractorPerformance[] | {contractorName, submittedCount, firstTimeApprovalRate}' | head -20
  else
    print_error "Failed to retrieve contractor performance"
  fi
}

# ============================================================
# Combined Dashboard Test
# ============================================================

test_combined_dashboard() {
  print_test "Get Combined RFI/Submittal Dashboard"

  if make_request "GET" "/analytics/dashboard?period=LAST_30_DAYS"; then
    print_success "Retrieved combined dashboard"
    echo "$body" | jq '{
      projectId,
      rfi_open: .rfi.summary.open,
      rfi_overdue: .rfi.summary.overdue,
      submittal_pending: .submittal.summary.submitted + .submittal.summary.underReview,
      submittal_overdue: .submittal.summary.overdue,
      total_open_items: .combined.totalOpenItems,
      total_overdue_items: .combined.totalOverdueItems,
      health_score: .combined.healthScore
    }'
  else
    print_error "Failed to retrieve combined dashboard"
  fi
}

# ============================================================
# Export Tests
# ============================================================

test_export_rfi_list_csv() {
  print_test "Export RFI List to CSV"

  local export_data='{
    "reportType": "RFI_LIST",
    "format": "CSV",
    "filters": {
      "statuses": ["OPEN", "ANSWERED"]
    }
  }'

  if response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$export_data" \
    "$API_URL/projects/$PROJECT_ID/analytics/export"); then

    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 200 ]; then
      print_success "Exported RFI list to CSV"
      ((TOTAL_TESTS++))
      echo "  (First 3 lines of CSV output):"
      echo "$response" | sed '$d' | head -3
    else
      print_error "Failed to export RFI list (HTTP $http_code)"
      ((TOTAL_TESTS++))
    fi
  else
    print_error "Failed to export RFI list"
    ((TOTAL_TESTS++))
  fi
}

test_export_submittal_excel() {
  print_test "Export Submittal List to Excel"

  local export_data='{
    "reportType": "SUBMITTAL_LIST",
    "format": "EXCEL",
    "filters": {}
  }'

  if response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$export_data" \
    "$API_URL/projects/$PROJECT_ID/analytics/export" \
    -o /tmp/submittals.xlsx); then

    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 200 ] && [ -f /tmp/submittals.xlsx ]; then
      file_size=$(stat -f%z /tmp/submittals.xlsx 2>/dev/null || stat -c%s /tmp/submittals.xlsx 2>/dev/null)
      print_success "Exported Submittal list to Excel (${file_size} bytes)"
      ((TOTAL_TESTS++))
      rm -f /tmp/submittals.xlsx
    else
      print_error "Failed to export Submittal list (HTTP $http_code)"
      ((TOTAL_TESTS++))
    fi
  else
    print_error "Failed to export Submittal list"
    ((TOTAL_TESTS++))
  fi
}

test_export_analytics_summary_json() {
  print_test "Export Analytics Summary to JSON"

  local export_data='{
    "reportType": "RFI_ANALYTICS_SUMMARY",
    "format": "JSON",
    "filters": {
      "period": "LAST_30_DAYS"
    }
  }'

  if make_request "POST" "/analytics/export" "$export_data"; then
    print_success "Exported analytics summary to JSON"
    echo "$body" | jq 'keys' | head -10
  else
    print_error "Failed to export analytics summary"
  fi
}

# ============================================================
# Saved Reports Tests
# ============================================================

test_list_saved_reports() {
  print_test "List Saved Reports"

  if make_request "GET" "/analytics/reports"; then
    local count=$(echo "$body" | jq 'length')
    print_success "Retrieved $count saved reports"
    echo "$body" | jq '.[] | {id, name, reportType, isScheduled}' | head -20
  else
    print_error "Failed to list saved reports"
  fi
}

test_create_saved_report() {
  print_test "Create Saved Report"

  local report_data='{
    "name": "Weekly RFI Status Report - Test",
    "description": "Automated test report for open and overdue RFIs",
    "reportType": "RFI_STATUS",
    "configuration": {
      "dateRange": {
        "relativePeriod": "LAST_7_DAYS"
      },
      "filters": {
        "statuses": ["OPEN", "ANSWERED"],
        "priorities": ["HIGH", "CRITICAL"]
      }
    },
    "isTemplate": false,
    "isShared": true,
    "isScheduled": true,
    "scheduleConfig": {
      "frequency": "WEEKLY",
      "dayOfWeek": 1,
      "time": "09:00",
      "format": "EXCEL",
      "recipients": ["test@example.com"]
    }
  }'

  if make_request "POST" "/analytics/reports" "$report_data"; then
    REPORT_ID=$(echo "$body" | jq -r '.id')
    print_success "Created saved report (ID: $REPORT_ID)"
    echo "$body" | jq '{id, name, reportType, isScheduled}'
  else
    print_error "Failed to create saved report"
  fi
}

test_get_saved_report() {
  print_test "Get Saved Report Details"

  if [ -z "$REPORT_ID" ]; then
    echo "  Skipping (no report ID from previous test)"
    return
  fi

  if make_request "GET" "/analytics/reports/$REPORT_ID"; then
    print_success "Retrieved saved report details"
    echo "$body" | jq '{id, name, reportType, configuration: .configuration.filters}'
  else
    print_error "Failed to get saved report"
  fi
}

test_run_saved_report() {
  print_test "Run Saved Report"

  if [ -z "$REPORT_ID" ]; then
    echo "  Skipping (no report ID from previous test)"
    return
  fi

  if make_request "POST" "/analytics/reports/$REPORT_ID/run"; then
    print_success "Executed saved report"
    echo "$body" | jq '{reportName, reportType, generatedAt, data: .data | keys}' | head -10
  else
    print_error "Failed to run saved report"
  fi
}

test_update_saved_report() {
  print_test "Update Saved Report"

  if [ -z "$REPORT_ID" ]; then
    echo "  Skipping (no report ID from previous test)"
    return
  fi

  local update_data='{
    "name": "Weekly RFI Status Report - Updated",
    "description": "Updated description"
  }'

  if make_request "PUT" "/analytics/reports/$REPORT_ID" "$update_data"; then
    print_success "Updated saved report"
    echo "$body" | jq '{id, name, description}'
  else
    print_error "Failed to update saved report"
  fi
}

test_clone_saved_report() {
  print_test "Clone Saved Report"

  if [ -z "$REPORT_ID" ]; then
    echo "  Skipping (no report ID from previous test)"
    return
  fi

  local clone_data='{
    "name": "Cloned Report - Test"
  }'

  if make_request "POST" "/analytics/reports/$REPORT_ID/clone" "$clone_data"; then
    local cloned_id=$(echo "$body" | jq -r '.id')
    print_success "Cloned saved report (New ID: $cloned_id)"
    echo "$body" | jq '{id, name, reportType}'

    # Clean up cloned report
    curl -s -X DELETE \
      -H "Authorization: Bearer $TOKEN" \
      "$API_URL/projects/$PROJECT_ID/analytics/reports/$cloned_id" > /dev/null 2>&1
  else
    print_error "Failed to clone saved report"
  fi
}

test_get_report_templates() {
  print_test "Get Report Templates"

  if make_request "GET" "/analytics/reports/templates"; then
    local count=$(echo "$body" | jq 'length')
    print_success "Retrieved $count report templates"
    echo "$body" | jq '.[] | {id, name, reportType}' | head -20
  else
    print_error "Failed to get report templates"
  fi
}

test_delete_saved_report() {
  print_test "Delete Saved Report"

  if [ -z "$REPORT_ID" ]; then
    echo "  Skipping (no report ID from previous test)"
    return
  fi

  ((TOTAL_TESTS++))

  if response=$(curl -s -w "\n%{http_code}" \
    -X DELETE \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/projects/$PROJECT_ID/analytics/reports/$REPORT_ID"); then

    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 204 ] || [ "$http_code" -eq 200 ]; then
      print_success "Deleted saved report"
    else
      print_error "Failed to delete saved report (HTTP $http_code)"
    fi
  else
    print_error "Failed to delete saved report"
  fi
}

# ============================================================
# Snapshot Tests
# ============================================================

test_create_manual_snapshot() {
  print_test "Create Manual Snapshot"

  local snapshot_data='{
    "type": "DAILY"
  }'

  if make_request "POST" "/analytics/snapshots/create" "$snapshot_data"; then
    SNAPSHOT_ID_1=$(echo "$body" | jq -r '.id')
    print_success "Created manual snapshot (ID: $SNAPSHOT_ID_1)"
    echo "$body" | jq '{id, snapshotType, snapshotDate, healthScore: .summaryMetrics.overallHealthScore}'
  else
    print_error "Failed to create manual snapshot"
  fi
}

test_get_historical_snapshots() {
  print_test "Get Historical Snapshots (DAILY, limit 10)"

  if make_request "GET" "/analytics/snapshots/historical?type=DAILY&limit=10"; then
    local count=$(echo "$body" | jq 'length')
    print_success "Retrieved $count historical snapshots"
    echo "$body" | jq '.[] | {id, snapshotDate, rfi_open: .rfiMetrics.open, submittal_pending: .submittalMetrics.pending, healthScore: .summaryMetrics.overallHealthScore}' | head -20
  else
    print_error "Failed to get historical snapshots"
  fi
}

test_get_snapshot_trends() {
  print_test "Get Snapshot Trends (Last 30 days)"

  local end_date=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local start_date=$(date -u -d "30 days ago" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v-30d +"%Y-%m-%dT%H:%M:%SZ")

  if make_request "GET" "/analytics/snapshots/trends?type=DAILY&startDate=$start_date&endDate=$end_date"; then
    print_success "Retrieved snapshot trends"
    local date_count=$(echo "$body" | jq '.dates | length')
    echo "  Trend data points: $date_count"
    echo "$body" | jq '{
      first_date: .dates[0],
      last_date: .dates[-1],
      rfi_open_range: [(.rfiOpenCount | min), (.rfiOpenCount | max)],
      health_score_range: [(.healthScores | min), (.healthScores | max)]
    }'
  else
    print_error "Failed to get snapshot trends"
  fi
}

test_compare_snapshots() {
  print_test "Compare Two Snapshots"

  # Get two most recent snapshots
  if response=$(curl -s \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/projects/$PROJECT_ID/analytics/snapshots/historical?type=DAILY&limit=2"); then

    SNAPSHOT_ID_1=$(echo "$response" | jq -r '.[0].id')
    SNAPSHOT_ID_2=$(echo "$response" | jq -r '.[1].id')

    if [ "$SNAPSHOT_ID_1" != "null" ] && [ "$SNAPSHOT_ID_2" != "null" ]; then
      local compare_data="{
        \"snapshotId1\": \"$SNAPSHOT_ID_1\",
        \"snapshotId2\": \"$SNAPSHOT_ID_2\"
      }"

      if make_request "POST" "/analytics/snapshots/compare" "$compare_data"; then
        print_success "Compared snapshots"
        echo "$body" | jq '.changes'
      else
        print_error "Failed to compare snapshots"
      fi
    else
      echo "  Skipping (not enough snapshots available)"
    fi
  else
    print_error "Failed to fetch snapshots for comparison"
    ((TOTAL_TESTS++))
  fi
}

# ============================================================
# Summary Report
# ============================================================

print_summary() {
  print_header "TEST SUMMARY"

  echo ""
  echo "Total Tests:  $TOTAL_TESTS"
  echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
  echo -e "${RED}Failed:       $FAILED_TESTS${NC}"
  echo ""

  if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ ALL TESTS PASSED!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 0
  else
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    exit 1
  fi
}

# ============================================================
# Main Test Execution
# ============================================================

main() {
  print_header "RFI & SUBMITTAL ANALYTICS ENDPOINT TESTS"

  echo ""
  echo "Configuration:"
  echo "  API URL:     $API_URL"
  echo "  Project ID:  $PROJECT_ID"
  echo "  Token:       ${TOKEN:0:20}..."

  check_prerequisites

  # Check if specific test requested
  if [ -n "$1" ]; then
    case "$1" in
      rfi_summary) test_rfi_summary ;;
      rfi_complete) test_rfi_complete_analytics ;;
      rfi_response_time) test_rfi_response_time ;;
      rfi_aging) test_rfi_aging ;;
      rfi_bottlenecks) test_rfi_bottlenecks ;;
      submittal_summary) test_submittal_summary ;;
      submittal_complete) test_submittal_complete_analytics ;;
      submittal_approval) test_submittal_approval_metrics ;;
      submittal_lead_time) test_submittal_lead_time ;;
      dashboard) test_combined_dashboard ;;
      export_csv) test_export_rfi_list_csv ;;
      export_excel) test_export_submittal_excel ;;
      snapshots) test_get_historical_snapshots ;;
      *)
        echo "Unknown test: $1"
        echo "Available tests:"
        echo "  rfi_summary, rfi_complete, rfi_response_time, rfi_aging, rfi_bottlenecks"
        echo "  submittal_summary, submittal_complete, submittal_approval, submittal_lead_time"
        echo "  dashboard, export_csv, export_excel, snapshots"
        exit 1
        ;;
    esac
    print_summary
    exit 0
  fi

  # Run all tests
  print_header "RFI ANALYTICS TESTS"
  test_rfi_complete_analytics
  test_rfi_summary
  test_rfi_response_time
  test_rfi_aging
  test_rfi_bottlenecks
  test_rfi_with_filters

  print_header "SUBMITTAL ANALYTICS TESTS"
  test_submittal_complete_analytics
  test_submittal_summary
  test_submittal_approval_metrics
  test_submittal_lead_time
  test_submittal_by_division
  test_submittal_contractor_performance

  print_header "COMBINED DASHBOARD TEST"
  test_combined_dashboard

  print_header "EXPORT TESTS"
  test_export_rfi_list_csv
  test_export_submittal_excel
  test_export_analytics_summary_json

  print_header "SAVED REPORTS TESTS"
  test_list_saved_reports
  test_create_saved_report
  test_get_saved_report
  test_run_saved_report
  test_update_saved_report
  test_clone_saved_report
  test_get_report_templates
  test_delete_saved_report

  print_header "SNAPSHOT TESTS"
  test_create_manual_snapshot
  test_get_historical_snapshots
  test_get_snapshot_trends
  test_compare_snapshots

  print_summary
}

# Run main function
main "$@"
