import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProjectDependencies1762877003000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create dependency_type_enum
    await queryRunner.query(`
      CREATE TYPE dependency_type_enum AS ENUM (
        'FINISH_TO_START',
        'START_TO_START',
        'FINISH_TO_FINISH',
        'START_TO_FINISH',
        'INFORMATIONAL'
      )
    `);

    // Create project_dependencies table
    await queryRunner.createTable(
      new Table({
        name: 'project_dependencies',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'predecessor_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'successor_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'dependency_type',
            type: 'dependency_type_enum',
            isNullable: false,
          },
          {
            name: 'lag_days',
            type: 'integer',
            default: 0,
          },
          {
            name: 'is_critical',
            type: 'boolean',
            default: false,
          },
          {
            name: 'impact',
            type: 'varchar',
            length: '50',
            default: "'NONE'",
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'ACTIVE'",
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
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
            name: 'FK_project_dependencies_predecessor',
            columnNames: ['predecessor_id'],
            referencedTableName: 'projects',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_project_dependencies_successor',
            columnNames: ['successor_id'],
            referencedTableName: 'projects',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_project_dependencies_created_by',
            columnNames: ['created_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            name: 'FK_project_dependencies_updated_by',
            columnNames: ['updated_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
        uniques: [
          {
            name: 'UQ_project_dependencies_predecessor_successor',
            columnNames: ['predecessor_id', 'successor_id'],
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'project_dependencies',
      new TableIndex({
        name: 'IDX_project_dependencies_predecessor',
        columnNames: ['predecessor_id'],
      }),
    );

    await queryRunner.createIndex(
      'project_dependencies',
      new TableIndex({
        name: 'IDX_project_dependencies_successor',
        columnNames: ['successor_id'],
      }),
    );

    await queryRunner.createIndex(
      'project_dependencies',
      new TableIndex({
        name: 'IDX_project_dependencies_type',
        columnNames: ['dependency_type'],
      }),
    );

    await queryRunner.createIndex(
      'project_dependencies',
      new TableIndex({
        name: 'IDX_project_dependencies_critical',
        columnNames: ['is_critical'],
      }),
    );

    // Add check constraint to prevent self-references
    await queryRunner.query(`
      ALTER TABLE project_dependencies
      ADD CONSTRAINT CHK_project_dependencies_no_self_reference
      CHECK (predecessor_id != successor_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('project_dependencies');
    await queryRunner.query(`DROP TYPE IF EXISTS dependency_type_enum`);
  }
}
