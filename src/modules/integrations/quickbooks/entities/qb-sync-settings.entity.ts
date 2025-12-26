import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Organization } from '../../../organizations/entities/organization.entity';
import { QBSyncFrequency } from '../enums';

/**
 * QuickBooks Sync Settings Entity
 *
 * Stores organization-level sync configuration and preferences.
 * Controls automation behavior and default account mappings.
 */
@Entity('qb_sync_settings')
export class QBSyncSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'organization_id', unique: true })
  organizationId!: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @Column({ type: 'boolean', name: 'auto_sync_vendors', default: true })
  autoSyncVendors!: boolean;

  @Column({ type: 'boolean', name: 'auto_sync_bills', default: true })
  autoSyncBills!: boolean;

  @Column({ type: 'boolean', name: 'auto_sync_bill_payments', default: true })
  autoSyncBillPayments!: boolean;

  @Column({ type: 'boolean', name: 'auto_sync_customers', default: false })
  autoSyncCustomers!: boolean;

  @Column({ type: 'boolean', name: 'auto_sync_invoices', default: false })
  autoSyncInvoices!: boolean;

  @Column({ type: 'boolean', name: 'auto_sync_journal_entries', default: false })
  autoSyncJournalEntries!: boolean;

  @Column({ type: 'varchar', length: 50, name: 'sync_frequency', default: QBSyncFrequency.REALTIME })
  syncFrequency!: QBSyncFrequency;

  @Column({ type: 'varchar', length: 50, name: 'vendor_sync_frequency', default: QBSyncFrequency.REALTIME })
  vendorSyncFrequency!: QBSyncFrequency;

  @Column({ type: 'varchar', length: 50, name: 'bill_sync_frequency', default: QBSyncFrequency.REALTIME })
  billSyncFrequency!: QBSyncFrequency;

  @Column({ type: 'varchar', length: 50, name: 'customer_sync_frequency', default: QBSyncFrequency.REALTIME })
  customerSyncFrequency!: QBSyncFrequency;

  @Column({ type: 'varchar', length: 50, name: 'invoice_sync_frequency', default: QBSyncFrequency.REALTIME })
  invoiceSyncFrequency!: QBSyncFrequency;

  @Column({ type: 'timestamp with time zone', name: 'vendor_last_synced_at', nullable: true })
  vendorLastSyncedAt?: Date;

  @Column({ type: 'timestamp with time zone', name: 'bill_last_synced_at', nullable: true })
  billLastSyncedAt?: Date;

  @Column({ type: 'timestamp with time zone', name: 'customer_last_synced_at', nullable: true })
  customerLastSyncedAt?: Date;

  @Column({ type: 'timestamp with time zone', name: 'invoice_last_synced_at', nullable: true })
  invoiceLastSyncedAt?: Date;

  @Column({ type: 'varchar', length: 100, name: 'default_ap_account_id', nullable: true })
  defaultApAccountId?: string;

  @Column({ type: 'varchar', length: 255, name: 'default_ap_account_name', nullable: true })
  defaultApAccountName?: string;

  @Column({ type: 'varchar', length: 100, name: 'default_ar_account_id', nullable: true })
  defaultArAccountId?: string;

  @Column({ type: 'varchar', length: 255, name: 'default_ar_account_name', nullable: true })
  defaultArAccountName?: string;

  @Column({ type: 'varchar', length: 100, name: 'default_bank_account_id', nullable: true })
  defaultBankAccountId?: string;

  @Column({ type: 'varchar', length: 255, name: 'default_bank_account_name', nullable: true })
  defaultBankAccountName?: string;

  @Column({ type: 'boolean', name: 'enable_conflict_notifications', default: true })
  enableConflictNotifications!: boolean;

  @Column({ type: 'boolean', name: 'enable_sync_error_notifications', default: true })
  enableSyncErrorNotifications!: boolean;

  @Column({ type: 'integer', name: 'max_retry_attempts', default: 3 })
  maxRetryAttempts!: number;

  @Column({ type: 'integer', name: 'retry_delay_minutes', default: 5 })
  retryDelayMinutes!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
