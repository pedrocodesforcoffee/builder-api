import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

/**
 * Migration to create the refresh_tokens table
 *
 * This migration creates the table for storing hashed refresh tokens
 * used in the JWT authentication flow.
 *
 * Features:
 * - Stores hashed tokens (not plain text)
 * - Tracks token expiration
 * - Records IP and user agent for security
 * - Supports token revocation
 * - Foreign key to users table with CASCADE delete
 *
 * @migration CreateRefreshTokensTable
 */
export class CreateRefreshTokensTable1733760000000 implements MigrationInterface {
  name = 'CreateRefreshTokensTable1733760000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create refresh_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token_hash',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'revoked_at',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create index on user_id for efficient querying
    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_user_id',
        columnNames: ['user_id'],
      }),
    );

    // Create unique index on token_hash
    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_token_hash',
        columnNames: ['token_hash'],
        isUnique: true,
      }),
    );

    // Create index on expires_at for cleanup queries
    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'IDX_refresh_tokens_expires_at',
        columnNames: ['expires_at'],
      }),
    );

    // Add foreign key constraint to users table
    await queryRunner.createForeignKey(
      'refresh_tokens',
      new TableForeignKey({
        name: 'FK_refresh_tokens_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE', // Delete tokens when user is deleted
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('refresh_tokens', 'FK_refresh_tokens_user');

    // Drop indexes
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_expires_at');
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_token_hash');
    await queryRunner.dropIndex('refresh_tokens', 'IDX_refresh_tokens_user_id');

    // Drop table
    await queryRunner.dropTable('refresh_tokens', true);
  }
}
