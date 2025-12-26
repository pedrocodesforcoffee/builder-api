import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateMasterProjects1762877002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create master_projects table
    await queryRunner.createTable(
      new Table({
        name: 'master_projects',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'project_id',
            type: 'uuid',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'aggregated_budget',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
            default: 0,
          },
          {
            name: 'aggregated_cost',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
            default: 0,
          },
          {
            name: 'aggregated_progress',
            type: 'decimal',
            precision: 5,
            scale: 2,
            isNullable: true,
            default: 0,
          },
          {
            name: 'total_sub_projects',
            type: 'integer',
            default: 0,
          },
          {
            name: 'active_sub_projects',
            type: 'integer',
            default: 0,
          },
          {
            name: 'earliest_start',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'latest_end',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'aggregated_metrics',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'last_aggregated_at',
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
          },
        ],
        foreignKeys: [
          {
            name: 'FK_master_projects_project',
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
    await queryRunner.createIndex(
      'master_projects',
      new TableIndex({
        name: 'IDX_master_projects_project',
        columnNames: ['project_id'],
      }),
    );

    await queryRunner.createIndex(
      'master_projects',
      new TableIndex({
        name: 'IDX_master_projects_progress',
        columnNames: ['aggregated_progress'],
      }),
    );

    // Add check constraints
    await queryRunner.query(`
      ALTER TABLE master_projects
      ADD CONSTRAINT CHK_master_projects_progress_range
      CHECK (aggregated_progress >= 0 AND aggregated_progress <= 100)
    `);

    await queryRunner.query(`
      ALTER TABLE master_projects
      ADD CONSTRAINT CHK_master_projects_subprojects_non_negative
      CHECK (total_sub_projects >= 0 AND active_sub_projects >= 0)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('master_projects');
  }
}
