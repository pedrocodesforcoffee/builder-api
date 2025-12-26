import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMetricThresholds1700000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create metric_thresholds table
    await queryRunner.createTable(
      new Table({
        name: 'metric_thresholds',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'organization_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'metric',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'condition',
            type: 'enum',
            enum: ['gt', 'lt', 'gte', 'lte', 'eq', 'neq'],
            isNullable: false,
          },
          {
            name: 'value',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'unit',
            type: 'varchar',
            length: '50',
            isNullable: true,
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['INFO', 'WARNING', 'CRITICAL'],
            isNullable: false,
            default: "'WARNING'",
          },
          {
            name: 'enabled',
            type: 'boolean',
            isNullable: false,
            default: true,
          },
          {
            name: 'notify_roles',
            type: 'text',
            isNullable: false,
            default: "''",
          },
          {
            name: 'notify_users',
            type: 'text',
            isNullable: false,
            default: "''",
          },
          {
            name: 'notification_channels',
            type: 'text',
            isNullable: false,
            default: "'IN_APP'",
          },
          {
            name: 'grace_period_minutes',
            type: 'integer',
            isNullable: false,
            default: 0,
          },
          {
            name: 'cooldown_minutes',
            type: 'integer',
            isNullable: false,
            default: 60,
          },
          {
            name: 'message_template',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'priority',
            type: 'integer',
            isNullable: false,
            default: 100,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
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
        ],
        foreignKeys: [
          {
            name: 'FK_metric_thresholds_project',
            columnNames: ['project_id'],
            referencedTableName: 'projects',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_metric_thresholds_organization',
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
    await queryRunner.query(
      `CREATE INDEX "IDX_metric_thresholds_project" ON "metric_thresholds" ("project_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_metric_thresholds_organization" ON "metric_thresholds" ("organization_id")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_metric_thresholds_metric" ON "metric_thresholds" ("metric")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_metric_thresholds_enabled" ON "metric_thresholds" ("enabled")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('metric_thresholds');
  }
}