# Database Workflow - Development vs Production

This document explains our database management strategy for the Financials module (and the entire application).

## Current Phase: Pre-Production Development

We are currently in **active development with no production users**. This allows us to use a faster, more flexible workflow.

**Note:** All legacy migrations have been removed (December 2024). We're using entity-first development with `synchronize: true`. Fresh migrations will be generated before production launch.

### Development Workflow (CURRENT)

**Configuration:**
```env
DB_SYNCHRONIZE=true
```

**How it works:**
1. You update entity files (e.g., `cost-code.entity.ts`)
2. TypeORM automatically syncs the schema to the database on app restart
3. No need to write migrations manually
4. Fast iteration and prototyping

**Advantages:**
- Rapid development
- No migration files to maintain
- Schema changes happen automatically
- Easy to experiment with different structures

**Warnings:**
- DO NOT use `synchronize: true` in production (data loss risk)
- TypeORM may drop and recreate tables/columns
- Existing data can be lost on schema changes
- Use seed scripts (not migrations) for test data

### Resetting Your Database

When you need a fresh start:

```bash
# Drop all tables and restart the app
npm run db:reset

# Or manually:
psql -U postgres -d builder_api_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npm run start:dev
```

TypeORM will recreate all tables from your entities on startup.

---

## Production Workflow (FUTURE)

Before deploying to production with real users, follow this transition plan.

### Step 1: Disable Synchronize

**When:** Right before first production deployment

**Update `.env`:**
```env
DB_SYNCHRONIZE=false
```

**Update `.env.production`:**
```env
DB_SYNCHRONIZE=false
```

### Step 2: Generate Initial Migration

Create a single clean migration from all your current entities:

```bash
# First, create the migrations folder
mkdir -p src/migrations

# Generate migration from current entity state
npm run migration:generate -- -n InitialProductionSchema

# Review the generated migration in src/migrations/
# Make sure it creates all tables correctly

# Test the migration in development
npm run migration:run

# Verify migration worked
npm run migration:show
```

**Important:** This will be a single comprehensive migration containing ALL entities (users, organizations, projects, financials, RFIs, submittals, daily reports, punch lists, etc.).

### Step 3: From This Point Forward

All schema changes MUST use migrations:

```bash
# 1. Update your entity (e.g., add a new column)
# 2. Generate a migration
npm run migration:generate -- -n AddColumnToCommitments

# 3. Review the generated SQL
# 4. Test it in development
npm run migration:run

# 5. Commit both the entity AND the migration
git add src/modules/financials/entities/commitment.entity.ts
git add src/migrations/1234567890-AddColumnToCommitments.ts
git commit -m "Add new column to commitments"
```

### Migration Commands

```bash
# Generate a new migration from entity changes
npm run migration:generate -- -n MigrationName

# Run pending migrations
npm run migration:run

# Revert the last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

---

## CI/CD and Team Coordination

### Development Environment

**Current approach (pre-production):**
- Each developer manages their own local database
- Use `DB_SYNCHRONIZE=true` for automatic schema sync
- Share seed scripts (not migrations) for test data

**Best practices:**
- Run seed scripts after pulling code: `npm run seed:financials`
- If someone adds entities, just restart your app
- If you get schema errors, reset your database: `npm run db:reset`

### Production Environment

**Future approach:**
1. **CI/CD Pipeline:**
   - Run migrations automatically on deployment
   - Fail deployment if migrations fail
   - Never allow `synchronize: true` in production

2. **Team Workflow:**
   - All schema changes require migrations
   - Review migrations in code review
   - Test migrations in staging before production
   - Keep migrations small and focused

3. **Rollback Strategy:**
   - Each migration should have a working `down()` method
   - Test rollback in staging
   - Document data migration steps if needed

---

## Seed Data

### Development Seed Scripts (CURRENT)

Create seed scripts in `src/seeds/` for development data:

```typescript
// src/seeds/seed-cost-codes.ts
// Seed the 50 CSI MasterFormat divisions

export async function seedCostCodes() {
  // Insert CSI divisions 00-50
}
```

Run seeds:
```bash
npm run seed:financials
```

### Production Seed Data (FUTURE)

For production reference data (e.g., CSI cost codes):

**Option 1: Migration-based seeding (Recommended)**
```typescript
// src/migrations/1234567890-SeedCsiCostCodes.ts
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    INSERT INTO cost_codes (code, description, division, ...)
    VALUES ('00-00-00', 'General Requirements', 0, ...);
  `);
}
```

**Option 2: Application-level seeding**
- Run seeds as part of deployment process
- Use `npm run seed:production` in CI/CD
- Make seeds idempotent (safe to run multiple times)

---

## Troubleshooting

### Problem: "relation does not exist"

**Cause:** Your database schema doesn't match your entities

**Solution (Development):**
```bash
npm run db:reset
npm run start:dev
```

### Problem: "column does not exist"

**Cause:** You added a field to an entity but database wasn't updated

**Solution (Development):**
- Just restart the app (if `synchronize: true`)
- Or reset the database

**Solution (Production):**
- Generate and run a migration
- Never manually alter production database

### Problem: Data lost after restart

**Cause:** TypeORM synchronized and dropped/recreated a table

**Solution:**
- Use seed scripts to repopulate development data
- For production, always use migrations (never `synchronize: true`)

---

## Summary

### NOW (Development Phase - Current)
- ✅ Use `DB_SYNCHRONIZE=true` (active in .env)
- ✅ Edit entities directly - schema updates automatically
- ✅ Reset database freely with `npm run db:reset`
- ✅ Use seed scripts for test data
- ✅ No migrations folder - removed in December 2024
- ❌ Don't write migrations yet

### BEFORE PRODUCTION (Transition Plan)
- ✅ Set `DB_SYNCHRONIZE=false` in production environment
- ✅ Create migrations folder: `mkdir -p src/migrations`
- ✅ Generate initial migration from all current entities
- ✅ Test migration thoroughly in staging
- ✅ Document rollback procedures
- ❌ Never use `synchronize: true` in production

### AFTER PRODUCTION (Strict Migration Workflow)
- ✅ All schema changes via migrations only
- ✅ Review migrations in pull requests
- ✅ Test in staging before production deployment
- ✅ Keep migrations small and atomic
- ✅ Maintain working `down()` methods for rollback
- ❌ Never manually alter production database schema
- ❌ Never use `synchronize: true` in production
