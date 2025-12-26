/**
 * Change Order Test Helper
 *
 * Provides utility functions for seeding test data for change order E2E tests.
 */

import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test IDs for consistent reference across tests
 */
export const TEST_IDS = {
  project1: uuidv4(),
  project2: uuidv4(),
  primeContract1: uuidv4(),
  commitment1: uuidv4(),
  commitment2: uuidv4(),
  user1: null as string | null,
  user2: null as string | null,
};

/**
 * Seed test project for change orders
 */
export async function seedTestProject(
  dataSource: DataSource,
  organizationId: string,
  userId: string,
): Promise<string> {
  const projectId = TEST_IDS.project1;

  await dataSource.query(
    `INSERT INTO project (id, name, organization_id, status, created_by_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [projectId, 'Test Project for Change Orders', organizationId, 'active', userId],
  );

  return projectId;
}

/**
 * Seed test prime contract
 */
export async function seedTestPrimeContract(
  dataSource: DataSource,
  projectId: string,
  userId: string,
): Promise<string> {
  const primeContractId = TEST_IDS.primeContract1;

  await dataSource.query(
    `INSERT INTO prime_contract (id, project_id, title, contract_number, vendor_name,
      original_amount, revised_amount, status, start_date, end_date, created_by_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      primeContractId,
      projectId,
      'Test Prime Contract',
      'PC-001',
      'Owner Corp',
      1000000,
      1000000,
      'active',
      '2025-01-01',
      '2025-12-31',
      userId,
    ],
  );

  return primeContractId;
}

/**
 * Seed test commitment
 */
export async function seedTestCommitment(
  dataSource: DataSource,
  projectId: string,
  userId: string,
  vendorName = 'Test Subcontractor',
): Promise<string> {
  const commitmentId = uuidv4();

  await dataSource.query(
    `INSERT INTO commitment (id, project_id, title, commitment_number, vendor_name,
      commitment_type, original_amount, revised_amount, status, start_date, end_date,
      created_by_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [
      commitmentId,
      projectId,
      'Test Commitment',
      'CM-' + Math.floor(Math.random() * 1000),
      vendorName,
      'subcontract',
      500000,
      500000,
      'active',
      '2025-01-01',
      '2025-12-31',
      userId,
    ],
  );

  return commitmentId;
}

/**
 * Get user ID by email
 */
export async function getUserId(
  dataSource: DataSource,
  email: string,
): Promise<string> {
  const result = await dataSource.query(
    `SELECT id FROM "user" WHERE email = $1`,
    [email],
  );

  if (result.length === 0) {
    throw new Error(`User not found: ${email}`);
  }

  return result[0].id;
}

/**
 * Get organization ID for user
 */
export async function getUserOrganization(
  dataSource: DataSource,
  userId: string,
): Promise<string> {
  const result = await dataSource.query(
    `SELECT om.organization_id
     FROM organization_member om
     WHERE om.user_id = $1
     LIMIT 1`,
    [userId],
  );

  if (result.length === 0) {
    throw new Error(`No organization found for user: ${userId}`);
  }

  return result[0].organization_id;
}

/**
 * Clean up test change orders
 */
export async function cleanupChangeOrders(dataSource: DataSource): Promise<void> {
  // Delete in order of dependencies
  await dataSource.query(`DELETE FROM change_order_document WHERE 1=1`);
  await dataSource.query(`DELETE FROM change_order_history WHERE 1=1`);
  await dataSource.query(`DELETE FROM package_item WHERE 1=1`);
  await dataSource.query(`DELETE FROM change_order_package WHERE 1=1`);
  await dataSource.query(`DELETE FROM cco_line_item WHERE 1=1`);
  await dataSource.query(`DELETE FROM cco_tm_entry WHERE 1=1`);
  await dataSource.query(`DELETE FROM commitment_change_order WHERE 1=1`);
  await dataSource.query(`DELETE FROM oco_cost_breakdown WHERE 1=1`);
  await dataSource.query(`DELETE FROM owner_change_order WHERE 1=1`);
  await dataSource.query(`DELETE FROM pco_cost_tier WHERE 1=1`);
  await dataSource.query(`DELETE FROM potential_change_order WHERE 1=1`);
  await dataSource.query(`DELETE FROM change_order_approval_threshold WHERE 1=1`);
}

/**
 * Create valid PCO payload
 */
export function createPcoPayload(overrides = {}) {
  return {
    title: 'Test PCO',
    description: 'Test PCO description',
    requestorName: 'John Doe',
    priority: 'medium',
    ...overrides,
  };
}

/**
 * Create valid OCO payload
 */
export function createOcoPayload(primeContractId: string, overrides = {}) {
  return {
    primeContractId,
    title: 'Test OCO',
    description: 'Test OCO description',
    changeOrderNumber: 'OCO-' + Math.floor(Math.random() * 1000),
    amount: 50000,
    scheduleDays: 10,
    requestedBy: 'Owner',
    ...overrides,
  };
}

/**
 * Create valid CCO payload
 */
export function createCcoPayload(commitmentId: string, overrides = {}) {
  return {
    commitmentId,
    title: 'Test CCO',
    description: 'Test CCO description',
    changeOrderNumber: 'CCO-' + Math.floor(Math.random() * 1000),
    pricingType: 'lump_sum',
    ...overrides,
  };
}

/**
 * Create valid CO Package payload
 */
export function createPackagePayload(overrides = {}) {
  return {
    packageName: 'Test Package',
    description: 'Test package description',
    ...overrides,
  };
}

/**
 * Create valid cost tier payload for PCO
 */
export function createCostTierPayload(overrides = {}) {
  return {
    category: 'labor',
    description: 'Test labor cost',
    estimatedAmount: 10000,
    ...overrides,
  };
}

/**
 * Create valid cost breakdown payload for OCO
 */
export function createCostBreakdownPayload(overrides = {}) {
  return {
    items: [
      {
        category: 'labor',
        description: 'Labor costs',
        amount: 25000,
      },
      {
        category: 'materials',
        description: 'Material costs',
        amount: 15000,
      },
      {
        category: 'equipment',
        description: 'Equipment costs',
        amount: 10000,
      },
    ],
    ...overrides,
  };
}

/**
 * Create valid line item payload for CCO
 */
export function createLineItemPayload(overrides = {}) {
  return {
    description: 'Test line item',
    quantity: 100,
    unitOfMeasure: 'SF',
    unitPrice: 50,
    ...overrides,
  };
}

/**
 * Create valid T&M entry payload for CCO
 */
export function createTMEntryPayload(overrides = {}) {
  return {
    date: '2025-01-15',
    laborHours: 8,
    laborRate: 75,
    description: 'Test T&M entry',
    ...overrides,
  };
}

/**
 * Create valid document payload
 */
export function createDocumentPayload(documentId: string, overrides = {}) {
  return {
    documentId,
    documentType: 'contract',
    description: 'Test document',
    ...overrides,
  };
}

/**
 * Create valid approval threshold payload
 */
export function createThresholdPayload(overrides = {}) {
  return {
    thresholds: [
      {
        minAmount: 0,
        maxAmount: 10000,
        approverRole: 'project_manager',
      },
      {
        minAmount: 10001,
        maxAmount: 50000,
        approverRole: 'project_executive',
      },
      {
        minAmount: 50001,
        maxAmount: null,
        approverRole: 'owner',
      },
    ],
    ...overrides,
  };
}

/**
 * Wait for async operations (useful for testing)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate unique number suffix
 */
export function getUniqueSuffix(): string {
  return Date.now().toString().slice(-6);
}
