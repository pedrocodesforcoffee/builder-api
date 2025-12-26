#!/bin/bash

# Test Payment Application API Endpoints

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZjhiZWJmYS0wNmM1LTQ2OGItYjY3Ni02YTMwNzIwOTQ3MzkiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6InN5c3RlbV9hZG1pbiIsImp0aSI6ImZmNjQ2Yjg5OGEwOWQzYzg3ZmIxY2JlNmIzMTg4NTFhIiwib3JnYW5pemF0aW9ucyI6W3siaWQiOiIwYWFmZjNmYy0wNzY5LTQ3NmYtYTAzMS0yMjNiNGM1N2RjZjUiLCJyb2xlIjoib3duZXIifV0sInByb2plY3RzIjpbeyJyb2xlIjoicHJvamVjdF9hZG1pbiJ9LHsicm9sZSI6InByb2plY3RfbWFuYWdlciJ9LHsicm9sZSI6InByb2plY3RfYWRtaW4ifV0sImlhdCI6MTc2NTY4OTI1MH0.7QkVcPSNTkNCTb-NaFCUluvVzqY8NkOEqIriXYp0M-8"
PROJECT_ID="a6074e71-6f3f-40c0-a201-1e87b238df81"
BASE_URL="http://localhost:3000/api/v1"

echo "=========================================="
echo "Testing Payment Application API Endpoints"
echo "=========================================="
echo ""

# Get commitment ID for SC-001
echo "Getting commitment ID for SC-001..."
COMMITMENT_ID=$(psql postgresql://pperes@localhost:5432/builder_api_dev -t -c "SELECT id FROM commitments WHERE number = 'SC-001' LIMIT 1;" | xargs)
echo "Commitment ID: $COMMITMENT_ID"
echo ""

# Test 1: List Schedule of Values
echo "=========================================="
echo "TEST 1: List Schedule of Values"
echo "=========================================="
echo "GET $BASE_URL/projects/$PROJECT_ID/schedule-of-values"
echo ""
curl -s -X GET "$BASE_URL/projects/$PROJECT_ID/schedule-of-values" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""
echo ""

# Test 2: Get Schedule of Values by Commitment (with items)
echo "=========================================="
echo "TEST 2: Get SOV by Commitment (with items)"
echo "=========================================="
echo "GET $BASE_URL/projects/$PROJECT_ID/schedule-of-values/commitment/$COMMITMENT_ID?includeItems=true"
echo ""
curl -s -X GET "$BASE_URL/projects/$PROJECT_ID/schedule-of-values/commitment/$COMMITMENT_ID?includeItems=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""
echo ""

# Test 3: List Payment Applications
echo "=========================================="
echo "TEST 3: List Payment Applications"
echo "=========================================="
echo "GET $BASE_URL/projects/$PROJECT_ID/payment-applications"
echo ""
curl -s -X GET "$BASE_URL/projects/$PROJECT_ID/payment-applications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""
echo ""

# Test 4: List Payment Applications with Items
echo "=========================================="
echo "TEST 4: List Payment Applications (with items)"
echo "=========================================="
echo "GET $BASE_URL/projects/$PROJECT_ID/payment-applications?includeItems=true"
echo ""
curl -s -X GET "$BASE_URL/projects/$PROJECT_ID/payment-applications?includeItems=true" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""
echo ""

# Test 5: Get Payment Applications by Commitment
echo "=========================================="
echo "TEST 5: Get Payment Applications by Commitment"
echo "=========================================="
echo "GET $BASE_URL/projects/$PROJECT_ID/payment-applications/commitment/$COMMITMENT_ID"
echo ""
curl -s -X GET "$BASE_URL/projects/$PROJECT_ID/payment-applications/commitment/$COMMITMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""
echo ""

# Get a payment application ID
echo "Getting payment application ID..."
PAY_APP_ID=$(psql postgresql://pperes@localhost:5432/builder_api_dev -t -c "SELECT id FROM payment_applications WHERE commitment_id = '$COMMITMENT_ID' AND application_number = 1 LIMIT 1;" | xargs)
echo "Payment App ID: $PAY_APP_ID"
echo ""

# Test 6: Get Single Payment Application
echo "=========================================="
echo "TEST 6: Get Single Payment Application (with items)"
echo "=========================================="
echo "GET $BASE_URL/projects/$PROJECT_ID/payment-applications/$PAY_APP_ID"
echo ""
curl -s -X GET "$BASE_URL/projects/$PROJECT_ID/payment-applications/$PAY_APP_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""
echo ""

# Test 7: List Lien Waivers
echo "=========================================="
echo "TEST 7: List All Lien Waivers"
echo "=========================================="
echo "GET $BASE_URL/projects/$PROJECT_ID/lien-waivers"
echo ""
curl -s -X GET "$BASE_URL/projects/$PROJECT_ID/lien-waivers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""
echo ""

# Test 8: Get Lien Waivers by Payment Application
echo "=========================================="
echo "TEST 8: Get Lien Waivers by Payment Application"
echo "=========================================="
echo "GET $BASE_URL/projects/$PROJECT_ID/lien-waivers/payment-application/$PAY_APP_ID"
echo ""
curl -s -X GET "$BASE_URL/projects/$PROJECT_ID/lien-waivers/payment-application/$PAY_APP_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""
echo ""

echo "=========================================="
echo "All Tests Completed!"
echo "=========================================="
