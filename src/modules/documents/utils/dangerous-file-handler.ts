import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { XMLParser } from 'fast-xml-parser';
import unzipper from 'unzipper';

/**
 * Dangerous File Handler
 *
 * Provides sanitization and validation for file types that can contain
 * malicious content. This is a CRITICAL security component.
 *
 * Handles:
 * - SVG: Can contain embedded JavaScript
 * - XML: Can contain XXE (XML External Entity) attacks
 * - Archives (ZIP/RAR): Can contain zip bombs and path traversal attacks
 * - Office Documents: Can contain malicious macros
 */

export interface FileSecurityCheck {
  safe: boolean;
  reason?: string;
  sanitized?: Buffer;
  threats?: string[];
}

// Risk assessment for dangerous file types
export const DANGEROUS_TYPES: Record<string, {
  risk: 'high' | 'medium';
  handler: string;
  reason: string;
}> = {
  'image/svg+xml': {
    risk: 'high',
    handler: 'sanitizeSvg',
    reason: 'Can contain embedded JavaScript'
  },
  'application/xml': {
    risk: 'high',
    handler: 'sanitizeXml',
    reason: 'XML External Entity (XXE) attacks'
  },
  'text/xml': {
    risk: 'high',
    handler: 'sanitizeXml',
    reason: 'XML External Entity (XXE) attacks'
  },
  'application/zip': {
    risk: 'high',
    handler: 'validateArchive',
    reason: 'Zip bombs, malicious paths'
  },
  'application/x-rar': {
    risk: 'high',
    handler: 'validateArchive',
    reason: 'Can contain malicious content'
  },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    risk: 'medium',
    handler: 'flagOfficeMacros',
    reason: 'Can contain malicious macros'
  },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    risk: 'medium',
    handler: 'flagOfficeMacros',
    reason: 'Can contain malicious macros'
  }
};

/**
 * SVG Sanitization
 *
 * Removes all potentially dangerous elements and attributes from SVG files.
 * SVGs can contain embedded JavaScript which can lead to XSS attacks.
 */
export function sanitizeSvg(svgContent: string): FileSecurityCheck {
  try {
    const window = new JSDOM('').window;
    const DOMPurify = createDOMPurify(window);

    const sanitized = DOMPurify.sanitize(svgContent, {
      USE_PROFILES: { svg: true, svgFilters: true },
      // Forbid dangerous tags
      FORBID_TAGS: [
        'script', 'iframe', 'object', 'embed', 'foreignObject',
        'use', 'animate', 'animateMotion', 'animateTransform', 'set'
      ],
      // Forbid event handler attributes
      FORBID_ATTR: [
        'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
        'onmousemove', 'onmousedown', 'onmouseup', 'onfocus', 'onblur',
        'onchange', 'onsubmit', 'onreset', 'onselect', 'onkeydown',
        'onkeyup', 'onkeypress'
      ],
      // Keep only safe tags
      ALLOWED_TAGS: [
        'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line',
        'polyline', 'polygon', 'text', 'tspan', 'defs', 'linearGradient',
        'radialGradient', 'stop', 'pattern', 'mask', 'clipPath'
      ]
    });

    // Detect if dangerous content was removed
    const threats: string[] = [];
    if (svgContent.includes('<script')) threats.push('script tag');
    if (svgContent.includes('<foreignObject')) threats.push('foreignObject tag');
    if (/on\w+\s*=/.test(svgContent)) threats.push('event handlers');

    return {
      safe: threats.length === 0,
      sanitized: Buffer.from(sanitized, 'utf-8'),
      threats: threats.length > 0 ? threats : undefined,
      reason: threats.length > 0
        ? `Removed dangerous content: ${threats.join(', ')}`
        : undefined
    };
  } catch (error) {
    return {
      safe: false,
      reason: `SVG sanitization failed: ${(error as Error).message}`
    };
  }
}

/**
 * XML Sanitization
 *
 * Prevents XXE (XML External Entity) attacks by disabling entity processing
 * and rejecting DOCTYPE declarations.
 */
export function sanitizeXml(xmlContent: string): FileSecurityCheck {
  try {
    // CRITICAL: Check for DOCTYPE and ENTITY declarations
    const hasDoctype = xmlContent.includes('<!DOCTYPE');
    const hasEntity = xmlContent.includes('<!ENTITY');
    const hasSystemEntity = /<!ENTITY\s+\w+\s+SYSTEM/i.test(xmlContent);

    if (hasDoctype || hasEntity) {
      return {
        safe: false,
        reason: 'DOCTYPE and ENTITY declarations are not allowed (XXE prevention)',
        threats: [
          hasDoctype ? 'DOCTYPE declaration' : '',
          hasEntity ? 'ENTITY declaration' : '',
          hasSystemEntity ? 'SYSTEM entity reference' : ''
        ].filter(Boolean)
      };
    }

    // Parse XML safely with entity processing disabled
    const parser = new XMLParser({
      allowBooleanAttributes: true,
      ignoreDeclaration: true,
      // CRITICAL: Prevent XXE
      processEntities: false,
      htmlEntities: false,
      parseTagValue: false,
      parseAttributeValue: false,
      trimValues: true
    });

    // Attempt to parse
    parser.parse(xmlContent);

    return {
      safe: true,
      sanitized: Buffer.from(xmlContent, 'utf-8')
    };
  } catch (error) {
    return {
      safe: false,
      reason: `XML validation failed: ${(error as Error).message}`
    };
  }
}

/**
 * Archive Validation
 *
 * Validates ZIP/RAR archives for:
 * - Zip bombs (excessive compression ratios)
 * - Path traversal attacks (../../../etc/passwd)
 * - Excessive file counts
 */
export async function validateArchive(
  buffer: Buffer
): Promise<FileSecurityCheck> {
  const MAX_UNCOMPRESSED_SIZE = 1024 * 1024 * 1024; // 1GB limit
  const MAX_FILES = 10000;
  const MAX_COMPRESSION_RATIO = 100;
  const FORBIDDEN_PATHS = ['..', '/etc', '/root', '\\windows', '/bin', '/usr'];

  try {
    const directory = await unzipper.Open.buffer(buffer);

    let totalUncompressed = 0;
    let fileCount = 0;
    const threats: string[] = [];

    for (const file of directory.files) {
      fileCount++;

      // Check file count (potential zip bomb indicator)
      if (fileCount > MAX_FILES) {
        return {
          safe: false,
          reason: `Too many files in archive (${fileCount} > ${MAX_FILES})`,
          threats: ['Potential zip bomb - excessive file count']
        };
      }

      // Check for path traversal
      const suspiciousPath = FORBIDDEN_PATHS.some(p =>
        file.path.toLowerCase().includes(p.toLowerCase())
      );

      if (suspiciousPath) {
        threats.push(`Suspicious path: ${file.path}`);
      }

      // Check uncompressed size
      totalUncompressed += file.uncompressedSize;
      if (totalUncompressed > MAX_UNCOMPRESSED_SIZE) {
        return {
          safe: false,
          reason: `Uncompressed size exceeds limit (${totalUncompressed} > ${MAX_UNCOMPRESSED_SIZE})`,
          threats: ['Potential zip bomb - excessive uncompressed size']
        };
      }

      // Check compression ratio (zip bomb indicator)
      if (file.compressedSize > 0) {
        const ratio = file.uncompressedSize / file.compressedSize;
        if (ratio > MAX_COMPRESSION_RATIO) {
          threats.push(`High compression ratio (${ratio.toFixed(1)}:1) for ${file.path}`);
        }
      }
    }

    if (threats.length > 0) {
      return {
        safe: false,
        reason: 'Archive contains suspicious content',
        threats
      };
    }

    return { safe: true };
  } catch (error) {
    return {
      safe: false,
      reason: `Archive validation failed: ${(error as Error).message}`
    };
  }
}

/**
 * Office Document Macro Detection
 *
 * Office documents (.docx, .xlsx) can contain VBA macros which can be malicious.
 * Modern Office formats (OOXML) are actually ZIP files, and macros are stored
 * in vbaProject.bin files within the archive.
 */
export async function detectOfficeMacros(
  buffer: Buffer
): Promise<FileSecurityCheck> {
  try {
    const directory = await unzipper.Open.buffer(buffer);

    // Look for macro files
    const macroFiles = directory.files.filter(file =>
      file.path.includes('vbaProject.bin') ||
      file.path.includes('macros/') ||
      file.path.endsWith('.vba')
    );

    if (macroFiles.length > 0) {
      return {
        safe: false,
        reason: 'Document contains macros',
        threats: macroFiles.map(f => `Macro file: ${f.path}`)
      };
    }

    return { safe: true };
  } catch (error) {
    // If we can't read it as a ZIP, it might be an old format (.doc, .xls)
    // which always support macros
    return {
      safe: false,
      reason: 'Cannot verify macro presence (legacy format or parse error)',
      threats: ['Potentially legacy Office format with macro support']
    };
  }
}

/**
 * Process dangerous file based on type
 */
export async function processDangerousFile(
  buffer: Buffer,
  mimeType: string
): Promise<FileSecurityCheck> {
  const fileInfo = DANGEROUS_TYPES[mimeType];

  if (!fileInfo) {
    // Not a dangerous type, allow
    return { safe: true };
  }

  switch (fileInfo.handler) {
    case 'sanitizeSvg':
      return sanitizeSvg(buffer.toString('utf-8'));

    case 'sanitizeXml':
      return sanitizeXml(buffer.toString('utf-8'));

    case 'validateArchive':
      return await validateArchive(buffer);

    case 'flagOfficeMacros':
      return await detectOfficeMacros(buffer);

    default:
      return {
        safe: false,
        reason: `No handler for dangerous file type: ${mimeType}`
      };
  }
}
