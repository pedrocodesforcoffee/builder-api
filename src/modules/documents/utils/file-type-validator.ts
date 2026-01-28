import { fileTypeFromBuffer } from 'file-type';
import { lookup } from 'mime-types';

/**
 * File Type Validator
 *
 * Validates files by checking their magic bytes (file signature) rather than
 * trusting the client-provided MIME type. This prevents attacks where malicious
 * files are uploaded with fake extensions or MIME types.
 *
 * SECURITY CRITICAL: Never trust user-provided file types!
 */

export interface FileTypeValidationResult {
  valid: boolean;
  detectedType: string;
  reason?: string;
  securityRisk?: 'low' | 'medium' | 'high';
}

// Text-based files don't have magic bytes
const TEXT_BASED_EXTENSIONS = [
  'txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts',
  'md', 'yaml', 'yml', 'sql', 'log'
];

// MIME type aliases that should be considered equivalent
const MIME_TYPE_ALIASES: Record<string, string[]> = {
  'image/jpeg': ['image/jpg'],
  'application/x-zip-compressed': ['application/zip'],
  'application/x-rar': ['application/x-rar-compressed'],
};

/**
 * Validates file type by examining magic bytes
 */
export async function validateFileType(
  buffer: Buffer,
  claimedMimeType: string,
  fileName: string
): Promise<FileTypeValidationResult> {
  try {
    // 1. Detect actual file type from magic bytes
    const detected = await fileTypeFromBuffer(buffer);

    // 2. Handle text-based files (no magic bytes)
    if (!detected) {
      return handleTextBasedFile(fileName, claimedMimeType);
    }

    const detectedMime = detected.mime;

    // 3. Verify detected type matches claimed type
    if (!mimeTypesMatch(detectedMime, claimedMimeType)) {
      return {
        valid: false,
        detectedType: detectedMime,
        reason: `File content type (${detectedMime}) doesn't match claimed type (${claimedMimeType})`,
        securityRisk: 'high'
      };
    }

    // 4. Verify extension matches content
    const expectedExt = detected.ext;
    const actualExt = fileName.split('.').pop()?.toLowerCase();

    if (expectedExt !== actualExt) {
      // Allow common aliases (e.g., .jpeg vs .jpg)
      // file-type always returns 'jpg' for JPEG images
      const isAcceptableAlias = (expectedExt === 'jpg' && actualExt === 'jpeg');

      if (!isAcceptableAlias) {
        return {
          valid: false,
          detectedType: detectedMime,
          reason: `File extension .${actualExt} doesn't match content type .${expectedExt}`,
          securityRisk: 'high'
        };
      }
    }

    // 5. Check for dangerous file types
    const riskLevel = getDangerousFileRisk(detectedMime);

    return {
      valid: true,
      detectedType: detectedMime,
      securityRisk: riskLevel
    };
  } catch (error) {
    return {
      valid: false,
      detectedType: 'unknown',
      reason: `File type detection failed: ${(error as Error).message}`,
      securityRisk: 'high'
    };
  }
}

/**
 * Handle text-based files that don't have magic bytes
 */
function handleTextBasedFile(
  fileName: string,
  claimedMimeType: string
): FileTypeValidationResult {
  const ext = fileName.split('.').pop()?.toLowerCase();

  if (!ext || !TEXT_BASED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      detectedType: 'unknown',
      reason: 'Cannot determine file type (no magic bytes and unknown extension)',
      securityRisk: 'high'
    };
  }

  const expectedMime = lookup(ext) || 'text/plain';

  // Verify claimed MIME type matches extension
  if (!claimedMimeType.startsWith(expectedMime.split('/')[0])) {
    return {
      valid: false,
      detectedType: expectedMime,
      reason: `Extension .${ext} doesn't match claimed type ${claimedMimeType}`,
      securityRisk: 'high'
    };
  }

  return {
    valid: true,
    detectedType: expectedMime,
    securityRisk: 'low'
  };
}

/**
 * Check if two MIME types should be considered equivalent
 */
function mimeTypesMatch(detected: string, claimed: string): boolean {
  // Normalize
  const normalize = (m: string) => m.toLowerCase().replace('x-', '');
  const normalizedDetected = normalize(detected);
  const normalizedClaimed = normalize(claimed);

  // Direct match
  if (normalizedDetected === normalizedClaimed) {
    return true;
  }

  // Check aliases
  const detectedAliases = MIME_TYPE_ALIASES[detected] || [];
  const claimedAliases = MIME_TYPE_ALIASES[claimed] || [];

  return detectedAliases.includes(claimed) ||
         claimedAliases.includes(detected);
}

/**
 * Determine risk level for known dangerous file types
 */
function getDangerousFileRisk(mimeType: string): 'low' | 'medium' | 'high' {
  // High risk - Can contain executable code or active content
  const highRisk = [
    'image/svg+xml',              // Can contain JavaScript
    'text/html',                  // Can contain scripts
    'application/x-sh',           // Shell script
    'application/x-executable',   // Executable
    'application/x-msdos-program', // .exe
    'application/java-archive',   // .jar
  ];

  // Medium risk - Can contain macros or embedded content
  const mediumRisk = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word with macros
    'application/vnd.ms-excel',   // Excel with macros
    'application/zip',            // Can contain anything
    'application/x-rar',          // Can contain anything
    'application/xml',            // XXE vulnerability
    'text/xml',                   // XXE vulnerability
  ];

  if (highRisk.includes(mimeType)) {
    return 'high';
  }

  if (mediumRisk.includes(mimeType)) {
    return 'medium';
  }

  return 'low';
}

/**
 * Check if file type requires special security processing
 */
export function requiresSecurityProcessing(mimeType: string): boolean {
  const typesRequiringProcessing = [
    'image/svg+xml',
    'application/xml',
    'text/xml',
    'application/zip',
    'application/x-rar',
    'application/x-7z-compressed',
  ];

  return typesRequiringProcessing.includes(mimeType);
}
