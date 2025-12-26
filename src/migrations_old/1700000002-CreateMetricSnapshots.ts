import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateMetricSnapshots1700000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create metric_snapshots table
    await queryRunner.createTable(
      new Table({
        name: 'metric_snapshots',
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
            name: 'snapshot_date',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'metric_data',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'period',
            type: 'enum',
            enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
            isNullable: false,
            default: "'DAILY'",
          },
          {
            name: 'kpis',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'summary',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'created_at',
            type: 'timestamp',
            isNullable: false,
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        foreignKeys: [
          {
            name: 'FK_metric_snapshots_project',
            columnNames: ['project_id'],
            referencedTableName: 'projects',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_metric_snapshots_project_date" ON "metric_snapshots" ("project_id", "snapshot_date")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_metric_snapshots_project_period" ON "metric_snapshots" ("project_id", "period")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_metric_snapshots_date" ON "metric_snapshots" ("snapshot_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('metric_snapshots');
  }
}