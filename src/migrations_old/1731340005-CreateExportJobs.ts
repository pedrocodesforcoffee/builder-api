import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateExportJobs1731340005 implements MigrationInterface {
  name = 'CreateExportJobs1731340005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create export_jobs table
    await queryRunner.createTable(
      new Table({
        name: 'export_jobs',
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
            name: 'format',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            isNullable: false,
            default: "'PENDING'",
          },
          {
            name: 'criteria',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'columns',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'include_custom_fields',
            type: 'boolean',
            isNullable: false,
            default: false,
          },
          {
            name: 'max_records',
            type: 'integer',
            isNullable: false,
            default: 10000,
          },
          {
            name: 'record_count',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'file_size',
            type: 'bigint',
            isNullable: true,
          },
          {
            name: 'download_url',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'estimated_completion',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
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
            name: 'FK_export_jobs_user',
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_export_jobs_organization',
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
      'export_jobs',
      new TableIndex({
        name: 'IDX_export_jobs_user',
        columnNames: ['user_id'],
      }),
    );

    await queryRunner.createIndex(
      'export_jobs',
      new TableIndex({
        name: 'IDX_export_jobs_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'export_jobs',
      new TableIndex({
        name: 'IDX_export_jobs_created',
        columnNames: ['created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex('export_jobs', 'IDX_export_jobs_created');
    await queryRunner.dropIndex('export_jobs', 'IDX_export_jobs_status');
    await queryRunner.dropIndex('export_jobs', 'IDX_export_jobs_user');

    // Drop table
    await queryRunner.dropTable('export_jobs');
  }
}