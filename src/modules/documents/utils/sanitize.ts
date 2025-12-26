/**
 * Input Sanitization Utilities
 *
 * CRITICAL SECURITY: All user input must be sanitized before use.
 * This prevents:
 * - Path traversal attacks
 * - XSS attacks
 * - SQL injection (when concatenating strings)
 * - Command injection
 * - Null byte attacks
 */

/**
 * Sanitize file name
 *
 * Removes dangerous characters and patterns that could lead to:
 * - Path traversal (../, ..\)
 * - Null byte attacks (\0)
 * - Hidden files (leading dots)
 * - Command injection (special shell characters)
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return 'unnamed_file';
  }

  return fileName
    // Remove path components (directory separators)
    .replace(/^.*[\\\/]/, '')
    // Remove null bytes (poison null byte attack)
    .replace(/\0/g, '')
    // Remove control characters (ASCII 0-31, 127-159)
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    // Remove dangerous characters that could cause issues
    .replace(/[<>:"/\\|?*]/g, '_')
    // Remove leading/trailing dots (hidden files, relative paths)
    .replace(/^\.+/, '')
    .replace(/\.+$/, '')
    // Collapse multiple underscores
    .replace(/_+/g, '_')
    // Limit length (filesystem limits, database constraints)
    .substring(0, 200)
    // Trim whitespace
    .trim()
    // Ensure not empty after sanitization
    || 'unnamed_file';
}

/**
 * Sanitize metadata object
 *
 * Sanitizes user-provided metadata to prevent:
 * - XSS attacks (script tags in metadata)
 * - Excessively large metadata values
 * - Dangerous property names
 */
export function sanitizeMetadata(
  metadata: Record<string, any>,
  options: {
    maxKeyLength?: number;
    maxValueLength?: number;
    maxProperties?: number;
    allowedTypes?: ('string' | 'number' | 'boolean')[];
  } = {}
): Record<string, any> {
  const {
    maxKeyLength = 50,
    maxValueLength = 1000,
    maxProperties = 50,
    allowedTypes = ['string', 'number', 'boolean']
  } = options;

  const sanitized: Record<string, any> = {};
  let propertyCount = 0;

  for (const [key, value] of Object.entries(metadata)) {
    // Limit number of properties
    if (propertyCount >= maxProperties) {
      break;
    }

    // Sanitize key
    const safeKey = key
      // Remove non-alphanumeric except underscore and hyphen
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      // Limit length
      .substring(0, maxKeyLength)
      // Ensure not empty
      .trim();

    if (!safeKey) {
      continue;
    }

    // Sanitize value based on type
    const valueType = typeof value;

    if (!allowedTypes.includes(valueType as any)) {
      // Skip unsupported types (objects, arrays, functions, etc.)
      continue;
    }

    if (valueType === 'string') {
      sanitized[safeKey] = sanitizeString(value, maxValueLength);
    } else if (valueType === 'number' || valueType === 'boolean') {
      sanitized[safeKey] = value;
    }

    propertyCount++;
  }

  return sanitized;
}

/**
 * Sanitize string value
 *
 * Removes potentially dangerous HTML/JavaScript while preserving text
 */
export function sanitizeString(value: string, maxLength: number = 1000): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    // Remove script tags (all variants)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframe tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Limit length
    .substring(0, maxLength)
    // Trim whitespace
    .trim();
}

/**
 * Sanitize document name
 *
 * Similar to file name but allows more characters since it's for display
 */
export function sanitizeDocumentName(name: string): string {
  if (!name || typeof name !== 'string') {
    return 'Untitled Document';
  }

  return name
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove control characters
    .replace(/[\x00-\x1f\x80-\x9f]/g, '')
    // Remove only the most dangerous characters
    .replace(/[<>]/g, '')
    // Limit length
    .substring(0, 255)
    // Trim whitespace
    .trim()
    // Ensure not empty
    || 'Untitled Document';
}

/**
 * Sanitize S3 key
 *
 * Ensures S3 keys don't contain dangerous patterns
 */
export function sanitizeS3Key(key: string): string {
  return key
    // Remove leading slashes
    .replace(/^\/+/, '')
    // Remove parent directory references
    .replace(/\.\.+\//g, '')
    // Remove null bytes
    .replace(/\0/g, '')
    // Replace potentially problematic characters
    .replace(/[<>:"|?*]/g, '_')
    // Normalize multiple slashes
    .replace(/\/+/g, '/')
    // Trim
    .trim();
}

/**
 * Sanitize array of tags
 */
export function sanitizeTags(tags: string[], maxTags: number = 20, maxTagLength: number = 50): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .slice(0, maxTags)
    .map(tag => {
      if (typeof tag !== 'string') {
        return null;
      }
      return tag
        .replace(/[<>]/g, '')
        .substring(0, maxTagLength)
        .trim()
        .toLowerCase();
    })
    .filter((tag): tag is string => tag !== null && tag.length > 0);
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string | null {
  if (!email || typeof email !== 'string') {
    return null;
  }

  const sanitized = email.trim().toLowerCase();

  // Basic email validation
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize URL
 *
 * Ensures URLs are safe and use allowed protocols
 */
export function sanitizeUrl(url: string, allowedProtocols: string[] = ['http', 'https']): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  try {
    const parsed = new URL(url);

    // Check protocol
    const protocol = parsed.protocol.replace(':', '');
    if (!allowedProtocols.includes(protocol)) {
      return null;
    }

    // Reject javascript: protocol attempts
    if (url.toLowerCase().includes('javascript:')) {
      return null;
    }

    return parsed.toString();
  } catch (error) {
    return null;
  }
}

/**
 * Escape special characters for use in regex
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize description field
 */
export function sanitizeDescription(description: string, maxLength: number = 5000): string {
  if (!description || typeof description !== 'string') {
    return '';
  }

  return sanitizeString(description, maxLength);
}
