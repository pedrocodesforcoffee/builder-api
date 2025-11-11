import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateProjectMetrics1700000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create project_metrics table
    await queryRunner.createTable(
      new Table({
        name: 'project_metrics',
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
            name: 'metric_group',
            type: 'enum',
            enum: ['SCHEDULE', 'BUDGET', 'DOCUMENTS', 'RFIS', 'SUBMITTALS', 'TEAM', 'SAFETY', 'QUALITY'],
            isNullable: false,
          },
          {
            name: 'metric_data',
            type: 'jsonb',
            isNullable: false,
            default: "'{}'",
          },
          {
            name: 'calculated_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'expires_at',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'version',
            type: 'integer',
            isNullable: false,
            default: 1,
          },
          {
            name: 'calculation_duration',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'data_source_version',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'error_info',
            type: 'jsonb',
            isNullable: true,
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
            name: 'FK_project_metrics_project',
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
      `CREATE UNIQUE INDEX "IDX_project_metrics_project_group" ON "project_metrics" ("project_id", "metric_group")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_project_metrics_expires" ON "project_metrics" ("expires_at")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_project_metrics_calculated" ON "project_metrics" ("calculated_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('project_metrics');
  }
}