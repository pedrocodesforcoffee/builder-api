import * as crypto from 'crypto';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Token Encryption Utility
 *
 * Provides AES-256-GCM encryption/decryption for OAuth tokens.
 * Uses a 32-byte encryption key from environment configuration.
 *
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - Random 16-byte IV per encryption
 * - Authentication tag for integrity
 * - Constant-time comparison for tag verification
 *
 * Encrypted format: iv:encryptedData:authTag (hex encoded)
 */
@Injectable()
export class EncryptionUtil {
  private readonly logger = new Logger(EncryptionUtil.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16; // 128 bits
  private readonly tagLength = 16; // 128 bits
  private encryptionKey: Buffer;

  constructor(encryptionKeyHex: string) {
    // Validate key length (must be 32 bytes = 64 hex characters)
    if (!encryptionKeyHex || encryptionKeyHex.length !== 64) {
      throw new Error(
        'QB_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        'Generate with: openssl rand -hex 32',
      );
    }

    try {
      this.encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
      if (this.encryptionKey.length !== 32) {
        throw new Error('Invalid key length after conversion');
      }
    } catch (error) {
      throw new Error(`Invalid QB_ENCRYPTION_KEY format: ${(error as Error).message}`);
    }
  }

  /**
   * Encrypt a plaintext string
   *
   * @param plaintext String to encrypt
   * @returns Encrypted string in format: iv:encryptedData:authTag (hex)
   * @throws Error if encryption fails
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );

      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Return: iv:encryptedData:authTag (all hex encoded)
      return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
    } catch (error) {
      this.logger.error(`Encryption failed: ${(error as Error).message}`);
      throw new Error('Token encryption failed');
    }
  }

  /**
   * Decrypt an encrypted string
   *
   * @param encryptedData Encrypted string in format: iv:encryptedData:authTag (hex)
   * @returns Decrypted plaintext string
   * @throws Error if decryption fails or authentication tag is invalid
   */
  decrypt(encryptedData: string): string {
    try {
      // Parse encrypted data
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, encrypted, authTagHex] = parts;

      // Convert from hex
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      // Validate lengths
      if (iv.length !== this.ivLength) {
        throw new Error('Invalid IV length');
      }
      if (authTag.length !== this.tagLength) {
        throw new Error('Invalid auth tag length');
      }

      // Create decipher
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.encryptionKey,
        iv,
      );

      // Set authentication tag
      decipher.setAuthTag(authTag);

      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(`Decryption failed: ${(error as Error).message}`);
      throw new Error('Token decryption failed');
    }
  }

  /**
   * Check if a string is encrypted (matches expected format)
   *
   * @param data String to check
   * @returns True if data appears to be encrypted
   */
  isEncrypted(data: string): boolean {
    if (!data || typeof data !== 'string') {
      return false;
    }

    const parts = data.split(':');
    if (parts.length !== 3) {
      return false;
    }

    // Check if all parts are valid hex strings
    const hexRegex = /^[0-9a-fA-F]+$/;
    return parts.every(part => hexRegex.test(part));
  }

  /**
   * Securely compare two strings in constant time
   *
   * Prevents timing attacks when comparing sensitive data.
   *
   * @param a First string
   * @param b Second string
   * @returns True if strings are equal
   */
  constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);

    return crypto.timingSafeEqual(aBuffer, bBuffer);
  }
}
