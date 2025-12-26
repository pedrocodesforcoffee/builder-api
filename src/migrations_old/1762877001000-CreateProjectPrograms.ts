import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProjectPrograms1762877001000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create program_type_enum
    await queryRunner.query(`
      CREATE TYPE program_type_enum AS ENUM (
        'PORTFOLIO',
        'INITIATIVE',
        'CAMPAIGN',
        'REGION',
        'CUSTOM'
      )
    `);

    // Create project_programs table
    await queryRunner.createTable(
      new Table({
        name: 'project_programs',
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
            name: 'program_type',
            type: 'program_type_enum',
            isNullable: false,
          },
          {
            name: 'start_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'end_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'target_budget',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'actual_cost',
            type: 'decimal',
            precision: 15,
            scale: 2,
            isNullable: true,
            default: 0,
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
            name: 'FK_project_programs_organization',
            columnNames: ['organization_id'],
            referencedTableName: 'organizations',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_project_programs_created_by',
            columnNames: ['created_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
          {
            name: 'FK_project_programs_updated_by',
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
      'project_programs',
      new TableIndex({
        name: 'IDX_project_programs_organization',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'project_programs',
      new TableIndex({
        name: 'IDX_project_programs_type',
        columnNames: ['program_type'],
      }),
    );

    await queryRunner.createIndex(
      'project_programs',
      new TableIndex({
        name: 'IDX_project_programs_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('project_programs');
    await queryRunner.query(`DROP TYPE IF EXISTS program_type_enum`);
  }
}
