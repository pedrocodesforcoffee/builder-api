import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateAnalyticsTables1734522000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "snapshot_type_enum" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');
      CREATE TYPE "snapshot_category_enum" AS ENUM ('RFI', 'SUBMITTAL', 'COMBINED');
      CREATE TYPE "report_type_enum" AS ENUM (
        'RFI_STATUS',
        'RFI_AGING',
        'RFI_RESPONSE_TIME',
        'RFI_BY_DISCIPLINE',
        'RFI_IMPACT',
        'SUBMITTAL_STATUS',
        'SUBMITTAL_LOG',
        'SUBMITTAL_AGING',
        'SUBMITTAL_BY_SPEC',
        'SUBMITTAL_APPROVAL_RATE',
        'COMBINED_DASHBOARD',
        'USER_PERFORMANCE',
        'BOTTLENECK_ANALYSIS',
        'TREND_ANALYSIS',
        'CUSTOM'
      );
      CREATE TYPE "report_format_enum" AS ENUM ('JSON', 'CSV', 'EXCEL', 'PDF');
    `);

    // 1. Create analytics_snapshots table
    await queryRunner.createTable(
      new Table({
        name: 'analytics_snapshots',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'projectId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'snapshotType',
            type: 'snapshot_type_enum',
          },
          {
            name: 'category',
            type: 'snapshot_category_enum',
          },
          {
            name: 'snapshotDate',
            type: 'date',
          },
          {
            name: 'rfiMetrics',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'submittalMetrics',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'summaryMetrics',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for analytics_snapshots
    await queryRunner.createIndex(
      'analytics_snapshots',
      new TableIndex({
        name: 'IDX_analytics_snapshots_project_date_category',
        columnNames: ['projectId', 'snapshotDate', 'category'],
      }),
    );

    await queryRunner.createIndex(
      'analytics_snapshots',
      new TableIndex({
        name: 'IDX_analytics_snapshots_org_date_type',
        columnNames: ['organizationId', 'snapshotDate', 'snapshotType'],
      }),
    );

    // Create foreign keys for analytics_snapshots
    await queryRunner.createForeignKey(
      'analytics_snapshots',
      new TableForeignKey({
        name: 'FK_analytics_snapshots_project',
        columnNames: ['projectId'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'analytics_snapshots',
      new TableForeignKey({
        name: 'FK_analytics_snapshots_organization',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 2. Create user_performance_metrics table
    await queryRunner.createTable(
      new Table({
        name: 'user_performance_metrics',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'userId',
            type: 'uuid',
          },
          {
            name: 'projectId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'periodStart',
            type: 'date',
          },
          {
            name: 'periodEnd',
            type: 'date',
          },
          {
            name: 'rfiPerformance',
            type: 'jsonb',
          },
          {
            name: 'submittalPerformance',
            type: 'jsonb',
          },
          {
            name: 'performanceScore',
            type: 'decimal',
            precision: 5,
            scale: 2,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for user_performance_metrics
    await queryRunner.createIndex(
      'user_performance_metrics',
      new TableIndex({
        name: 'IDX_user_performance_metrics_user_project_period',
        columnNames: ['userId', 'projectId', 'periodStart'],
      }),
    );

    await queryRunner.createIndex(
      'user_performance_metrics',
      new TableIndex({
        name: 'IDX_user_performance_metrics_project_period',
        columnNames: ['projectId', 'periodStart'],
      }),
    );

    // Create foreign keys for user_performance_metrics
    await queryRunner.createForeignKey(
      'user_performance_metrics',
      new TableForeignKey({
        name: 'FK_user_performance_metrics_user',
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_performance_metrics',
      new TableForeignKey({
        name: 'FK_user_performance_metrics_project',
        columnNames: ['projectId'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'user_performance_metrics',
      new TableForeignKey({
        name: 'FK_user_performance_metrics_organization',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // 3. Create saved_reports table
    await queryRunner.createTable(
      new Table({
        name: 'saved_reports',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'projectId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'organizationId',
            type: 'uuid',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'reportType',
            type: 'report_type_enum',
          },
          {
            name: 'configuration',
            type: 'jsonb',
          },
          {
            name: 'isTemplate',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isShared',
            type: 'boolean',
            default: false,
          },
          {
            name: 'isScheduled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'scheduleConfig',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdById',
            type: 'uuid',
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes for saved_reports
    await queryRunner.createIndex(
      'saved_reports',
      new TableIndex({
        name: 'IDX_saved_reports_project_type',
        columnNames: ['projectId', 'reportType'],
      }),
    );

    await queryRunner.createIndex(
      'saved_reports',
      new TableIndex({
        name: 'IDX_saved_reports_created_by',
        columnNames: ['createdById'],
      }),
    );

    await queryRunner.createIndex(
      'saved_reports',
      new TableIndex({
        name: 'IDX_saved_reports_org_template',
        columnNames: ['organizationId', 'isTemplate'],
      }),
    );

    // Create foreign keys for saved_reports
    await queryRunner.createForeignKey(
      'saved_reports',
      new TableForeignKey({
        name: 'FK_saved_reports_project',
        columnNames: ['projectId'],
        referencedTableName: 'projects',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'saved_reports',
      new TableForeignKey({
        name: 'FK_saved_reports_organization',
        columnNames: ['organizationId'],
        referencedTableName: 'organizations',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'saved_reports',
      new TableForeignKey({
        name: 'FK_saved_reports_created_by',
        columnNames: ['createdById'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.dropForeignKey('saved_reports', 'FK_saved_reports_created_by');
    await queryRunner.dropForeignKey('saved_reports', 'FK_saved_reports_organization');
    await queryRunner.dropForeignKey('saved_reports', 'FK_saved_reports_project');
    await queryRunner.dropForeignKey('user_performance_metrics', 'FK_user_performance_metrics_organization');
    await queryRunner.dropForeignKey('user_performance_metrics', 'FK_user_performance_metrics_project');
    await queryRunner.dropForeignKey('user_performance_metrics', 'FK_user_performance_metrics_user');
    await queryRunner.dropForeignKey('analytics_snapshots', 'FK_analytics_snapshots_organization');
    await queryRunner.dropForeignKey('analytics_snapshots', 'FK_analytics_snapshots_project');

    // Drop tables
    await queryRunner.dropTable('saved_reports');
    await queryRunner.dropTable('user_performance_metrics');
    await queryRunner.dropTable('analytics_snapshots');

    // Drop enums
    await queryRunner.query(`
      DROP TYPE "report_format_enum";
      DROP TYPE "report_type_enum";
      DROP TYPE "snapshot_category_enum";
      DROP TYPE "snapshot_type_enum";
    `);
  }
}
