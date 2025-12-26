import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSearchAnalytics1731340004 implements MigrationInterface {
  name = 'CreateSearchAnalytics1731340004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create search_analytics table
    await queryRunner.createTable(
      new Table({
        name: 'search_analytics',
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
            isNullable: true,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'query',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'criteria',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'result_count',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'execution_time',
            type: 'integer',
            isNullable: false,
            comment: 'Execution time in milliseconds',
          },
          {
            name: 'clicked_result_ids',
            type: 'jsonb',
            isNullable: true,
            default: "'[]'::jsonb",
          },
          {
            name: 'clicked_position',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'was_cached',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'varchar',
            length: '45',
            isNullable: true,
          },
        ],
        foreignKeys: [
          {
            name: 'FK_search_analytics_user',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            name: 'FK_search_analytics_organization',
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'search_analytics',
      new TableIndex({
        name: 'IDX_search_analytics_user',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'search_analytics',
      new TableIndex({
        name: 'IDX_search_analytics_organization',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'search_analytics',
      new TableIndex({
        name: 'IDX_search_analytics_timestamp',
        columnNames: ['timestamp'],
      }),
    );

    // Trigram index for query field (if pg_trgm is available)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_search_analytics_query"
      ON "search_analytics" USING GIN (query gin_trgm_ops)
      WHERE query IS NOT NULL;
    `).catch(() => {
      // Fall back to regular index if trigram not available
      queryRunner.createIndex(
        'search_analytics',
        new TableIndex({
          name: 'IDX_search_analytics_query',
          columnNames: ['query'],
        }),
      );
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('search_analytics', 'IDX_search_analytics_query');
    await queryRunner.dropIndex('search_analytics', 'IDX_search_analytics_timestamp');
    await queryRunner.dropIndex('search_analytics', 'IDX_search_analytics_organization');
    await queryRunner.dropIndex('search_analytics', 'IDX_search_analytics_user');

    // Drop table
    await queryRunner.dropTable('search_analytics');
  }
}