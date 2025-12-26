import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { SubmittalEvent } from '../entities/submittal-event.entity';
import { ApprovalAction } from '../entities/approval-action.entity';

/**
 * Integrity Service
 *
 * Provides cryptographic integrity verification using blockchain-style hash chains.
 * Ensures tamper detection for audit trails.
 *
 * Features:
 * - SHA-256 hash generation
 * - Hash chain verification
 * - Tamper detection
 * - Digital signature support (placeholder)
 */
@Injectable()
export class IntegrityService {
  private readonly logger = new Logger(IntegrityService.name);

  constructor(
    @InjectRepository(SubmittalEvent)
    private readonly eventRepo: Repository<SubmittalEvent>,
    @InjectRepository(ApprovalAction)
    private readonly actionRepo: Repository<ApprovalAction>,
  ) {}

  // ==================== Hash Generation ====================

  /**
   * Generate SHA-256 hash for any data
   */
  generateHash(data: any): string {
    const jsonData = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(jsonData).digest('hex');
  }

  /**
   * Generate hash for submittal event
   */
  generateEventHash(event: SubmittalEvent): string {
    const data = {
      submittalId: event.submittalId,
      eventType: event.eventType,
      actorId: event.actorId,
      createdAt: event.createdAt.toISOString(),
      changeData: event.changeData,
      previousEventHash: event.previousEventHash,
      sequenceNumber: event.sequenceNumber,
    };

    return this.generateHash(data);
  }

  /**
   * Generate hash for approval action
   */
  generateActionHash(action: ApprovalAction): string {
    const data = {
      documentApprovalId: action.documentApprovalId,
      approvalChainId: action.approvalChainId,
      actionType: action.actionType,
      actorId: action.actorId,
      createdAt: action.createdAt.toISOString(),
      changeData: action.changeData,
      previousActionHash: action.previousActionHash,
      sequenceNumber: action.sequenceNumber,
    };

    return this.generateHash(data);
  }

  // ==================== Verification ====================

  /**
   * Verify hash of a single event
   */
  verifyEventHash(event: SubmittalEvent): boolean {
    const computedHash = this.generateEventHash(event);
    return event.eventHash === computedHash;
  }

  /**
   * Verify hash of a single action
   */
  verifyActionHash(action: ApprovalAction): boolean {
    const computedHash = this.generateActionHash(action);
    return action.actionHash === computedHash;
  }

  /**
   * Verify complete hash chain for a submittal
   */
  async verifySubmittalChain(submittalId: string): Promise<{
    isValid: boolean;
    totalEvents: number;
    verifiedEvents: number;
    tamperedEvents: string[];
    brokenLinks: Array<{ eventId: string; reason: string }>;
  }> {
    const events = await this.eventRepo.find({
      where: { submittalId },
      order: { sequenceNumber: 'ASC' },
    });

    const tamperedEvents: string[] = [];
    const brokenLinks: Array<{ eventId: string; reason: string }> = [];
    let verifiedEvents = 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Verify hash
      if (!this.verifyEventHash(event)) {
        this.logger.warn(`Event ${event.id} has invalid hash`);
        tamperedEvents.push(event.id);
        continue;
      }

      // Verify chain link
      if (i > 0) {
        const previousEvent = events[i - 1];
        if (event.previousEventHash !== previousEvent.eventHash) {
          this.logger.warn(
            `Event ${event.id} has broken chain link to previous event`,
          );
          brokenLinks.push({
            eventId: event.id,
            reason: `Previous hash mismatch: expected ${previousEvent.eventHash}, got ${event.previousEventHash}`,
          });
          continue;
        }
      } else {
        // First event should have null previous hash
        if (event.previousEventHash !== null) {
          this.logger.warn(`First event ${event.id} has non-null previous hash`);
          brokenLinks.push({
            eventId: event.id,
            reason: 'First event should have null previous hash',
          });
          continue;
        }
      }

      verifiedEvents++;
    }

    const isValid =
      verifiedEvents === events.length &&
      tamperedEvents.length === 0 &&
      brokenLinks.length === 0;

    return {
      isValid,
      totalEvents: events.length,
      verifiedEvents,
      tamperedEvents,
      brokenLinks,
    };
  }

  /**
   * Verify complete hash chain for an approval chain
   */
  async verifyApprovalChain(approvalChainId: string): Promise<{
    isValid: boolean;
    totalActions: number;
    verifiedActions: number;
    tamperedActions: string[];
    brokenLinks: Array<{ actionId: string; reason: string }>;
  }> {
    const actions = await this.actionRepo.find({
      where: { approvalChainId },
      order: { sequenceNumber: 'ASC' },
    });

    const tamperedActions: string[] = [];
    const brokenLinks: Array<{ actionId: string; reason: string }> = [];
    let verifiedActions = 0;

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      // Verify hash
      if (!this.verifyActionHash(action)) {
        this.logger.warn(`Action ${action.id} has invalid hash`);
        tamperedActions.push(action.id);
        continue;
      }

      // Verify chain link
      if (i > 0) {
        const previousAction = actions[i - 1];
        if (action.previousActionHash !== previousAction.actionHash) {
          this.logger.warn(
            `Action ${action.id} has broken chain link to previous action`,
          );
          brokenLinks.push({
            actionId: action.id,
            reason: `Previous hash mismatch: expected ${previousAction.actionHash}, got ${action.previousActionHash}`,
          });
          continue;
        }
      }

      verifiedActions++;
    }

    const isValid =
      verifiedActions === actions.length &&
      tamperedActions.length === 0 &&
      brokenLinks.length === 0;

    return {
      isValid,
      totalActions: actions.length,
      verifiedActions,
      tamperedActions,
      brokenLinks,
    };
  }

  // ==================== Chain Building ====================

  /**
   * Get previous event hash for chain
   */
  async getPreviousEventHash(submittalId: string): Promise<string | null> {
    const lastEvent = await this.eventRepo.findOne({
      where: { submittalId },
      order: { sequenceNumber: 'DESC' },
    });

    return lastEvent?.eventHash || null;
  }

  /**
   * Get next sequence number for event
   */
  async getNextEventSequence(submittalId: string): Promise<number> {
    const lastEvent = await this.eventRepo.findOne({
      where: { submittalId },
      order: { sequenceNumber: 'DESC' },
    });

    return lastEvent ? lastEvent.sequenceNumber + 1 : 0;
  }

  /**
   * Get previous action hash for chain
   */
  async getPreviousActionHash(
    approvalChainId: string,
  ): Promise<string | null> {
    const lastAction = await this.actionRepo.findOne({
      where: { approvalChainId },
      order: { sequenceNumber: 'DESC' },
    });

    return lastAction?.actionHash || null;
  }

  /**
   * Get next sequence number for action
   */
  async getNextActionSequence(approvalChainId: string): Promise<number> {
    const lastAction = await this.actionRepo.findOne({
      where: { approvalChainId },
      order: { sequenceNumber: 'DESC' },
    });

    return lastAction ? lastAction.sequenceNumber + 1 : 0;
  }

  // ==================== Digital Signatures (Placeholder) ====================

  /**
   * Generate digital signature
   *
   * TODO: Implement actual cryptographic signature with private key
   */
  generateSignature(data: any, userId: string): string {
    // Placeholder implementation
    // In production, would use actual digital signature with private key
    const dataHash = this.generateHash(data);
    const timestamp = new Date().toISOString();
    const signatureData = `${userId}:${timestamp}:${dataHash}`;

    return crypto.createHash('sha256').update(signatureData).digest('hex');
  }

  /**
   * Verify digital signature
   *
   * TODO: Implement actual signature verification with public key
   */
  verifySignature(signature: string, data: any, userId: string): boolean {
    // Placeholder implementation
    // In production, would verify with public key
    const expectedSignature = this.generateSignature(data, userId);
    return signature === expectedSignature;
  }

  // ==================== Tamper Detection ====================

  /**
   * Mark submittal as tampered if chain is broken
   */
  async detectAndMarkTampering(submittalId: string): Promise<boolean> {
    const verification = await this.verifySubmittalChain(submittalId);

    if (!verification.isValid) {
      this.logger.error(
        `Tampering detected for submittal ${submittalId}: ${verification.tamperedEvents.length} tampered events, ${verification.brokenLinks.length} broken links`,
      );

      // TODO: Mark submittal as tampered in database
      // TODO: Send alerts to administrators

      return true;
    }

    return false;
  }

  /**
   * Run integrity check on all submittals
   *
   * Used by scheduled job
   */
  async runIntegrityCheck(): Promise<{
    totalSubmittals: number;
    validSubmittals: number;
    tamperedSubmittals: string[];
  }> {
    this.logger.log('Running integrity check on all submittals...');

    // Get all unique submittal IDs
    const results = await this.eventRepo
      .createQueryBuilder('event')
      .select('DISTINCT event.submittalId')
      .getRawMany();

    const submittalIds = results.map((r) => r.submittalId);
    const tamperedSubmittals: string[] = [];
    let validSubmittals = 0;

    for (const submittalId of submittalIds) {
      const verification = await this.verifySubmittalChain(submittalId);
      if (verification.isValid) {
        validSubmittals++;
      } else {
        tamperedSubmittals.push(submittalId);
      }
    }

    this.logger.log(
      `Integrity check complete: ${validSubmittals}/${submittalIds.length} valid, ${tamperedSubmittals.length} tampered`,
    );

    return {
      totalSubmittals: submittalIds.length,
      validSubmittals,
      tamperedSubmittals,
    };
  }
}
