# Database Setup Guide

## Current Database State

The database has been successfully initialized with a clean schema and seeded with test data.

### Test User Credentials

**Admin User:**
- Email: `admin@example.com`
- Password: `password123`
- Role: `system_admin`
- Member of: Test Organization (owner)
- Project Admin on: 2 projects

**Regular User:**
- Email: `user@example.com`
- Password: `password123`
- Role: `user`

### Seeded Data

**Organization:**
- Test Organization (1)

**Projects:**
1. **Downtown Office Tower** (PROJ-2025-001)
   - Type: Commercial
   - Status: Construction
   - Budget: $15,000,000.00
   - Progress: 35.5%
   - Description: A 25-story mixed-use office tower in downtown with retail space on ground floor

2. **Riverside Apartments** (PROJ-2025-002)
   - Type: Residential
   - Status: Preconstruction
   - Budget: $8,500,000.00
   - Progress: 5.0%
   - Description: 120-unit luxury apartment complex with amenities and parking

3. **Highway Bridge Expansion** (PROJ-2025-003)
   - Type: Infrastructure
   - Status: Bidding
   - Budget: $22,000,000.00
   - Progress: 0.0%
   - Description: Expansion and renovation of existing highway bridge structure

**Cost Codes (for Downtown Office Tower):**
- 01 - General Requirements
- 03 - Concrete
- 05 - Metals
- 09 - Finishes

**Budgets:**
- **Original Budget** (Downtown Office Tower)
  - Status: ACTIVE
  - Total Budget: $15,000,000.00
  - Contingency: $500,000.00
  - Line Items: 4 (covering Labor, Materials, and Subcontracts)

**Commitments (for Downtown Office Tower):**
1. **SC-001: Structural Steel Subcontract**
   - Type: SUBCONTRACT
   - Status: ACTIVE
   - Vendor: ABC Steel Corporation
   - Amount: $2,500,000.00
   - Retention: 10%

2. **PO-001: Concrete Materials Purchase Order**
   - Type: PURCHASE_ORDER
   - Status: ACTIVE
   - Vendor: Premier Concrete Supply
   - Amount: $625,000.00
   - Retention: 5%

3. **SC-002: HVAC System Installation**
   - Type: SUBCONTRACT
   - Status: PENDING_APPROVAL
   - Vendor: Comfort Climate Controls
   - Amount: $1,850,000.00
   - Retention: 10%

**Budget Snapshots (Historical Tracking):**
1. **Initial Budget - Project Kickoff** (30 days ago)
   - Original Amount: $6,575,000.00
   - Committed: $0.00
   - Actual: $0.00
   - Description: Baseline budget established at project kickoff

2. **After Steel Contract Award** (15 days ago)
   - Original Amount: $6,575,000.00
   - Committed: $2,500,000.00
   - Actual: $0.00
   - Description: Budget snapshot after awarding structural steel subcontract

3. **Month End - December 2025** (today)
   - Original Amount: $6,575,000.00
   - Committed: $3,125,000.00
   - Actual: $875,000.00
   - Description: End of month budget snapshot showing current progress

**Schedule of Values (SOV):**
1. **SOV for SC-001 (Structural Steel)**
   - Total Value: $2,500,000.00
   - Line Items:
     - Line 1: Steel framing - columns and beams ($1,500,000.00)
     - Line 2: Steel decking and accessories ($800,000.00)
     - Line 3: Misc. steel and connections ($200,000.00)

2. **SOV for PO-001 (Concrete Materials)**
   - Total Value: $625,000.00
   - Line Items:
     - Line 1: Foundation concrete - 4000 PSI ($375,000.00)
     - Line 2: Structural concrete - 5000 PSI ($250,000.00)

**Payment Applications:**
1. **SC-001 - Application #1** (APPROVED - 20 days ago)
   - Period: 50 days ago → 20 days ago
   - Total Completed: $750,000.00 (30% of contract)
   - Retainage: $75,000.00 (10%)
   - Current Payment Due: $675,000.00
   - Status: Approved 15 days ago
   - Has Conditional Lien Waiver

2. **SC-001 - Application #2** (SUBMITTED - 5 days ago)
   - Period: 20 days ago → 5 days ago
   - Total Completed: $1,250,000.00 (50% cumulative)
   - Retainage: $125,000.00 (10%)
   - Previous Payments: $675,000.00
   - Current Payment Due: $450,000.00
   - Status: Submitted 4 days ago
   - Has Conditional Lien Waiver

3. **PO-001 - Application #1** (DRAFT - today)
   - Period: 30 days ago → today
   - Total Completed: $250,000.00 (40% of contract)
   - Retainage: $12,500.00 (5%)
   - Current Payment Due: $237,500.00
   - Status: Draft (not yet submitted)

**Lien Waivers:**
1. **SC-001 App #1 - Conditional Waiver** ($675,000.00)
   - Type: CONDITIONAL
   - Uploaded 15 days ago (when approved)
   - Document: SC-001_App01_Conditional_Waiver.pdf

2. **SC-001 App #2 - Conditional Waiver** ($450,000.00)
   - Type: CONDITIONAL
   - Uploaded 4 days ago (with submission)
   - Document: SC-001_App02_Conditional_Waiver.pdf

### Quick Start

1. **Start the API server:**
   ```bash
   npm run start:dev
   ```

2. **Test the login:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password123"}'
   ```

   You should receive a JSON response with `accessToken`, `refreshToken`, and user details.

3. **Reseed the database (if needed):**
   ```bash
   psql builder_api_dev < seed-data.sql
   ```

4. **Reset the database completely (if needed):**
   ```bash
   # Stop the API first
   pkill -f "nest start"

   # Drop and recreate the database
   psql postgresql://pperes@localhost:5432/postgres -c "DROP DATABASE IF EXISTS builder_api_dev;"
   psql postgresql://pperes@localhost:5432/postgres -c "CREATE DATABASE builder_api_dev OWNER pperes;"

   # Start the API - it will auto-create tables with DB_SYNCHRONIZE=true
   npm run start:dev

   # Create test user
   psql postgresql://pperes@localhost:5432/builder_api_dev -c "
     INSERT INTO users (email, password, first_name, last_name, system_role)
     VALUES ('admin@example.com', '\$2b\$12\$f.9AZoxysqXgLDzebfZJ7.8Km90P2J640GXOOLHfPVi6eCa5FvcLG', 'Admin', 'User', 'system_admin');
   "
   ```

## Database Configuration

The database is configured with:
- **Type:** PostgreSQL
- **Database:** `builder_api_dev`
- **Owner:** `pperes`
- **Auto-sync:** Enabled (`DB_SYNCHRONIZE=true` in `.env`)

## Schema Status

✅ **All entity duplicate index issues fixed**
- Fixed 7 entities with duplicate `@Index()` decorators
- report-schedule.entity.ts
- report-execution.entity.ts
- submittal-reviewer.entity.ts
- submittal-document.entity.ts
- submittal-event.entity.ts
- workflow-template.entity.ts
- budget-audit-log.entity.ts
- custom-report.entity.ts

✅ **97+ tables successfully created**
- All TypeORM entities synchronized
- All relationships properly configured
- All indexes created without conflicts

## Important Notes

1. **DB_SYNCHRONIZE** is set to `true` in development for auto-schema updates
2. **No migrations needed** - TypeORM handles schema automatically
3. **Test user password** is `password123` (bcrypt hashed)
4. **System roles** available: `user`, `system_admin`

## Troubleshooting

### API won't start
- Check if PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check if port 3000 is available: `lsof -i :3000`
- Check API logs: `tail -f /tmp/api-*.log`

### Login fails
- Verify test user exists: `psql builder_api_dev -c "SELECT email, system_role FROM users;"`
- Check API health: `curl http://localhost:3000/api/health`

### Database connection errors
- Verify connection string in `.env`
- Check PostgreSQL is accepting connections
- Ensure database `builder_api_dev` exists

## Additional Commands

```bash
# Check all tables
psql builder_api_dev -c "\dt"

# View users
psql builder_api_dev -c "SELECT id, email, first_name, last_name, system_role FROM users;"

# Check API status
curl http://localhost:3000/api/health | jq
```
