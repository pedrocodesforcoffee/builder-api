import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePortfolioViews1762877004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create portfolio_views table
    await queryRunner.createTable(
      new Table({
        name: 'portfolio_views',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'view_type',
            type: 'varchar',
            length: '50',
            default: "'STANDARD'",
          },
          {
            name: 'filters',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'columns',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'sort_order',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'is_default',
            type: 'boolean',
            default: false,
          },
          {
            name: 'is_public',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'updated_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_portfolio_views_organization',
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_portfolio_views_created_by',
            columnNames: ['created_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            name: 'FK_portfolio_views_updated_by',
            columnNames: ['updated_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'portfolio_views',
      new TableIndex({
        name: 'IDX_portfolio_views_organization',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'portfolio_views',
      new TableIndex({
        name: 'IDX_portfolio_views_type',
        columnNames: ['view_type'],
      }),
    );

    await queryRunner.createIndex(
      'portfolio_views',
      new TableIndex({
        name: 'IDX_portfolio_views_created_by',
        columnNames: ['created_by'],
      }),
    );

    // Create GIN indexes for JSONB columns
    await queryRunner.query(`
      CREATE INDEX IDX_portfolio_views_filters
      ON portfolio_views USING GIN (filters)
    `);

    await queryRunner.query(`
      CREATE INDEX IDX_portfolio_views_columns
      ON portfolio_views USING GIN (columns)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('portfolio_views');
  }
}
