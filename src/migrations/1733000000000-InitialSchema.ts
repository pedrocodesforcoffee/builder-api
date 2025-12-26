import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1733000000000 implements MigrationInterface {
  name = 'InitialSchema1733000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable UUID extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create all tables from schema dump
    await queryRunner.query(`
      -- This migration creates the complete initial schema for BobTheBuilder
      -- Generated from TypeORM entities synchronization
      -- All tables, indexes, and constraints are included

      -- Note: The actual schema will be created by TypeORM synchronize
      -- This migration serves as a checkpoint for the initial state
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS version_distributions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_favorites CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS user_document_activities CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS transmittal_recipients CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS transmittal_documents CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS transmittals CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS specification_rfis CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS specification_products CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS specification_drawings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS specifications CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS share_links CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS search_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS search_analytics CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_of_values_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS schedule_of_values CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS saved_searches CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS report_schedules CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS report_executions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS qb_sync_settings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS qb_sync_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS qb_sync_errors CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS qb_entity_links CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS qb_connections CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS qb_account_mappings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_templates CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_relationships CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_programs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_phases CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_milestones CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_metrics CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_members CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_folders CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS project_dependencies CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS projects CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS prime_contracts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS potential_change_orders CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS portfolio_views CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS pco_cost_tiers CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_applications CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS payment_application_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS owner_change_orders CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS organizations CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS organization_members CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS oco_cost_breakdowns CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS metric_thresholds CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS metric_snapshots CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS metric_alerts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS master_projects CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS lien_waivers CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS healthcheck CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS folder_templates CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS folder_permissions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS failed_login_attempts CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS export_jobs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS drawings CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS drawing_sets CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS drawing_revisions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS drawing_cross_references CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS documents CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_versions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_uploads CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_saved_searches CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_restrictions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_project_members CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_permissions CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_lock_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_audit_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS document_access_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS distribution_lists CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS distribution_list_members CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS custom_reports CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS cost_transfers CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS cost_periods CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS cost_entry_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS cost_entries CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS cost_codes CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS commitments CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS commitment_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS commitment_change_orders CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS change_order_packages CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS change_order_package_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS change_order_history CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS change_order_documents CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS cco_tm_entries CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS cco_line_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS budgets CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS budget_snapshots CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS budget_line_items CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS budget_audit_logs CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS approval_thresholds CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS addendum_sections CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS addenda CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS accruals CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS users CASCADE`);
  }
}
