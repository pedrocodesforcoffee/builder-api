/**
 * Queue Names
 *
 * Centralized definition of Bull queue names for document processing
 */

export const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: 'document-processing',
} as const;

export const JOB_NAMES = {
  VIRUS_SCAN: 'virus-scan',
  GENERATE_THUMBNAIL: 'generate-thumbnail',
  EXTRACT_TEXT_OCR: 'extract-text-ocr',
  EXTRACT_METADATA: 'extract-metadata',
} as const;
