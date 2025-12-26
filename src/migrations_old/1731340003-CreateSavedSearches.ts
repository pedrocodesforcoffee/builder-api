import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateSavedSearches1731340003 implements MigrationInterface {
  name = 'CreateSavedSearches1731340003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create saved_searches table
    await queryRunner.createTable(
      new Table({
        name: 'saved_searches',
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
            name: 'criteria',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'::jsonb",
          },
          {
            name: 'sort_by',
            type: 'varchar',
            length: '50',
            isNullable: true,
            default: "'relevance'",
          },
          {
            name: 'sort_order',
            type: 'varchar',
            length: '10',
            isNullable: true,
            default: "'desc'",
          },
          {
            name: 'columns',
            type: 'jsonb',
            isNullable: true,
            default: "'[]'::jsonb",
          },
          {
            name: 'is_public',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'shared_with_users',
            type: 'jsonb',
            isNullable: true,
            default: "'[]'::jsonb",
          },
          {
            name: 'shared_with_roles',
            type: 'jsonb',
            isNullable: true,
            default: "'[]'::jsonb",
          },
          {
            name: 'enable_notifications',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'notification_frequency',
            type: 'varchar',
            length: '20',
            isNullable: true,
            default: "'DAILY'",
          },
          {
            name: 'last_notification_sent',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'execution_count',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'last_executed',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'average_result_count',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'tags',
            type: 'jsonb',
            isNullable: true,
            default: "'[]'::jsonb",
          },
          {
            name: 'color',
            type: 'varchar',
            length: '7',
            isNullable: true,
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '50',
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
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_saved_searches_user',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_saved_searches_organization',
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'saved_searches',
      new TableIndex({
        name: 'IDX_saved_searches_user',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'saved_searches',
      new TableIndex({
        name: 'IDX_saved_searches_organization',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'saved_searches',
      new TableIndex({
        name: 'IDX_saved_searches_public',
        columnNames: ['is_public'],
      }),
    );

    await queryRunner.createIndex(
      'saved_searches',
      new TableIndex({
        name: 'IDX_saved_searches_last_executed',
        columnNames: ['last_executed'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('saved_searches', 'IDX_saved_searches_last_executed');
    await queryRunner.dropIndex('saved_searches', 'IDX_saved_searches_public');
    await queryRunner.dropIndex('saved_searches', 'IDX_saved_searches_organization');
    await queryRunner.dropIndex('saved_searches', 'IDX_saved_searches_user');

    // Drop table
    await queryRunner.dropTable('saved_searches');
  }
}