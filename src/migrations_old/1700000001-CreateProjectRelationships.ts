import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateProjectRelationships1700000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create project_relationships table
    await queryRunner.createTable(
      new Table({
        name: 'project_relationships',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'source_project_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'target_project_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'relationship_type',
            type: 'enum',
            enum: ['PARENT_CHILD', 'PROGRAM', 'MASTER', 'DEPENDENCY', 'RELATED'],
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
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
            name: 'FK_project_relationships_source',
            columnNames: ['source_project_id'],
            referencedTableName: 'projects',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_project_relationships_target',
            columnNames: ['target_project_id'],
            referencedTableName: 'projects',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
          {
            name: 'FK_project_relationships_created_by',
            columnNames: ['created_by'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
          },
        ],
        uniques: [
          {
            name: 'UQ_project_relationships_source_target_type',
            columnNames: ['source_project_id', 'target_project_id', 'relationship_type'],
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'project_relationships',
      new TableIndex({
        name: 'IDX_project_relationships_source',
        columnNames: ['source_project_id'],
      }),
    );

    await queryRunner.createIndex(
      'project_relationships',
      new TableIndex({
        name: 'IDX_project_relationships_target',
        columnNames: ['target_project_id'],
      }),
    );

    await queryRunner.createIndex(
      'project_relationships',
      new TableIndex({
        name: 'IDX_project_relationships_type',
        columnNames: ['relationship_type'],
      }),
    );

    await queryRunner.createIndex(
      'project_relationships',
      new TableIndex({
        name: 'IDX_project_relationships_source_target',
        columnNames: ['source_project_id', 'target_project_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('project_relationships');
  }
}