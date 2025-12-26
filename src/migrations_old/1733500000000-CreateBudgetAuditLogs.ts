import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateBudgetAuditLogs1733500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create budget_audit_logs table
    await queryRunner.createTable(
      new Table({
        name: 'budget_audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'budget_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'line_item_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'action',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'before',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'after',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'timestamp',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'ip_address',
            type: 'inet',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'entity_type',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'changes',
            type: 'jsonb',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // Create composite indexes for performance
    await queryRunner.createIndex(
      'budget_audit_logs',
      new TableIndex({
        name: 'IDX_budget_audit_logs_budget_timestamp',
        columnNames: ['budget_id', 'timestamp'],
      }),
    );

    await queryRunner.createIndex(
      'budget_audit_logs',
      new TableIndex({
        name: 'IDX_budget_audit_logs_line_item_timestamp',
        columnNames: ['line_item_id', 'timestamp'],
      }),
    );

    await queryRunner.createIndex(
      'budget_audit_logs',
      new TableIndex({
        name: 'IDX_budget_audit_logs_user_timestamp',
        columnNames: ['user_id', 'timestamp'],
      }),
    );

    // Create individual indexes for commonly queried fields
    await queryRunner.createIndex(
      'budget_audit_logs',
      new TableIndex({
        name: 'IDX_budget_audit_logs_budget_id',
        columnNames: ['budget_id'],
      }),
    );

    await queryRunner.createIndex(
      'budget_audit_logs',
      new TableIndex({
        name: 'IDX_budget_audit_logs_action',
        columnNames: ['action'],
      }),
    );

    await queryRunner.createIndex(
      'budget_audit_logs',
      new TableIndex({
        name: 'IDX_budget_audit_logs_entity_type',
        columnNames: ['entity_type'],
      }),
    );

    await queryRunner.createIndex(
      'budget_audit_logs',
      new TableIndex({
        name: 'IDX_budget_audit_logs_timestamp',
        columnNames: ['timestamp'],
      }),
    );

    await queryRunner.createIndex(
      'budget_audit_logs',
      new TableIndex({
        name: 'IDX_budget_audit_logs_user_id',
        columnNames: ['user_id'],
      }),
    );

    // Create foreign key constraints
    await queryRunner.createForeignKey(
      'budget_audit_logs',
      new TableForeignKey({
        name: 'FK_budget_audit_logs_budget',
        columnNames: ['budget_id'],
        referencedTableName: 'budgets',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'budget_audit_logs',
      new TableForeignKey({
        name: 'FK_budget_audit_logs_line_item',
        columnNames: ['line_item_id'],
        referencedTableName: 'budget_line_items',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'budget_audit_logs',
      new TableForeignKey({
        name: 'FK_budget_audit_logs_user',
        columnNames: ['user_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey(
      'budget_audit_logs',
      'FK_budget_audit_logs_user',
    );
    await queryRunner.dropForeignKey(
      'budget_audit_logs',
      'FK_budget_audit_logs_line_item',
    );
    await queryRunner.dropForeignKey(
      'budget_audit_logs',
      'FK_budget_audit_logs_budget',
    );

    // Drop indexes
    await queryRunner.dropIndex(
      'budget_audit_logs',
      'IDX_budget_audit_logs_user_id',
    );
    await queryRunner.dropIndex(
      'budget_audit_logs',
      'IDX_budget_audit_logs_timestamp',
    );
    await queryRunner.dropIndex(
      'budget_audit_logs',
      'IDX_budget_audit_logs_entity_type',
    );
    await queryRunner.dropIndex(
      'budget_audit_logs',
      'IDX_budget_audit_logs_action',
    );
    await queryRunner.dropIndex(
      'budget_audit_logs',
      'IDX_budget_audit_logs_budget_id',
    );
    await queryRunner.dropIndex(
      'budget_audit_logs',
      'IDX_budget_audit_logs_user_timestamp',
    );
    await queryRunner.dropIndex(
      'budget_audit_logs',
      'IDX_budget_audit_logs_line_item_timestamp',
    );
    await queryRunner.dropIndex(
      'budget_audit_logs',
      'IDX_budget_audit_logs_budget_timestamp',
    );

    // Drop table
    await queryRunner.dropTable('budget_audit_logs');
  }
}
