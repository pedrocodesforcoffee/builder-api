import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * Migration to create the failed_login_attempts table
 *
 * This migration creates the table for tracking failed login attempts
 * used for rate limiting and security monitoring.
 *
 * Features:
 * - Tracks attempts by email and IP address
 * - Indexed for fast querying in rate limiting checks
 * - Stores timestamp for time-window calculations
 * - Supports security auditing and analysis
 *
 * @migration CreateFailedLoginAttemptsTable
 */
export class CreateFailedLoginAttemptsTable1733760100000 implements MigrationInterface {
  name = 'CreateFailedLoginAttemptsTable1733760100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create failed_login_attempts table
    await queryRunner.createTable(
      new Table({
        name: 'failed_login_attempts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: false,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'attempted_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create index on email for efficient lookup
    await queryRunner.createIndex(
      'failed_login_attempts',
      new TableIndex({
        name: 'IDX_failed_login_email',
        columnNames: ['email'],
      }),
    );

    // Create index on ip_address
    await queryRunner.createIndex(
      'failed_login_attempts',
      new TableIndex({
        name: 'IDX_failed_login_ip_address',
        columnNames: ['ip_address'],
      }),
    );

    // Create composite index on email and ip_address for rate limiting
    await queryRunner.createIndex(
      'failed_login_attempts',
      new TableIndex({
        name: 'IDX_failed_login_email_ip',
        columnNames: ['email', 'ip_address'],
      }),
    );

    // Create index on attempted_at for time-window queries
    await queryRunner.createIndex(
      'failed_login_attempts',
      new TableIndex({
        name: 'IDX_failed_login_attempted_at',
        columnNames: ['attempted_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('failed_login_attempts', 'IDX_failed_login_attempted_at');
    await queryRunner.dropIndex('failed_login_attempts', 'IDX_failed_login_email_ip');
    await queryRunner.dropIndex('failed_login_attempts', 'IDX_failed_login_ip_address');
    await queryRunner.dropIndex('failed_login_attempts', 'IDX_failed_login_email');

    // Drop table
    await queryRunner.dropTable('failed_login_attempts', true);
  }
}
