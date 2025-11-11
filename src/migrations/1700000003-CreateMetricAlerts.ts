import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMetricAlerts1700000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create metric_alerts table
    await queryRunner.createTable(
      new Table({
        name: 'metric_alerts',
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
            isNullable: false,
          },
          {
            name: 'metric',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'severity',
            type: 'enum',
            enum: ['INFO', 'WARNING', 'CRITICAL'],
            isNullable: false,
            default: "'WARNING'",
          },
          {
            name: 'message',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'current_value',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'threshold',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['ACTIVE', 'RESOLVED', 'ACKNOWLEDGED'],
            isNullable: false,
            default: "'ACTIVE'",
          },
          {
            name: 'triggered_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'resolved_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'acknowledged_by',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'acknowledged_at',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'occurrence_count',
            type: 'integer',
            isNullable: false,
            default: 1,
          },
          {
            name: 'last_seen_at',
            type: 'timestamp',
            isNullable: false,
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
        ],
        foreignKeys: [
          {
            name: 'FK_metric_alerts_project',
            columnNames: ['project_id'],
            referencedTableName: 'projects',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_metric_alerts_acknowledger',
            columnNames: ['acknowledged_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_metric_alerts_project_status" ON "metric_alerts" ("project_id", "status")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_metric_alerts_triggered" ON "metric_alerts" ("triggered_at")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_metric_alerts_severity" ON "metric_alerts" ("severity")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_metric_alerts_metric" ON "metric_alerts" ("metric")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('metric_alerts');
  }
}