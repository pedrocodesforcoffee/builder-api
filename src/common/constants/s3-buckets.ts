/**
 * S3 Bucket Configuration
 *
 * CRITICAL SECURITY: Implements quarantine-first architecture
 *
 * Files are uploaded to QUARANTINE bucket first, then moved to PRODUCTION
 * bucket only after passing virus scan. This prevents serving infected files.
 */

export const S3_BUCKETS = {
  /** Quarantine bucket for uploads pending virus scan */
  QUARANTINE:
    process.env.S3_QUARANTINE_BUCKET || 'builder-uploads-quarantine',

  /** Production bucket for verified, safe files */
  PRODUCTION: process.env.S3_DOCUMENTS_BUCKET || 'builder-documents',
} as const;

export type S3BucketType = keyof typeof S3_BUCKETS;
