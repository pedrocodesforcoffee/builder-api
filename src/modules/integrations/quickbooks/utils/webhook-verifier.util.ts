import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

/**
 * QuickBooks Webhook Verifier Utility
 *
 * Verifies the authenticity of webhook notifications from QuickBooks
 * using HMAC-SHA256 signature validation.
 *
 * QuickBooks sends webhook notifications with a signature in the
 * 'intuit-signature' header. This utility verifies that signature
 * to ensure the webhook is genuinely from QuickBooks.
 *
 * @utility
 */
export class WebhookVerifierUtil {
  private readonly logger = new Logger(WebhookVerifierUtil.name);

  /**
   * Verify webhook signature
   *
   * @param payload - Raw webhook payload (string)
   * @param signature - Signature from 'intuit-signature' header
   * @param verifierToken - Webhook verifier token from config
   * @returns True if signature is valid, false otherwise
   */
  verify(payload: string, signature: string, verifierToken: string): boolean {
    try {
      // QuickBooks sends signature in format: intuit-signature=<base64-encoded-hmac>
      // Extract the actual signature value
      const signatureValue = this.extractSignatureValue(signature);

      if (!signatureValue) {
        this.logger.warn('Invalid signature format: missing signature value');
        return false;
      }

      // Compute expected signature
      const expectedSignature = this.computeSignature(payload, verifierToken);

      // Compare signatures using timing-safe comparison
      const isValid = this.timingSafeCompare(signatureValue, expectedSignature);

      if (!isValid) {
        this.logger.warn('Webhook signature verification failed');
      }

      return isValid;
    } catch (error: any) {
      this.logger.error(
        `Error verifying webhook signature: ${error?.message}`,
        error?.stack,
      );
      return false;
    }
  }

  /**
   * Extract signature value from header
   *
   * QuickBooks sends signature in format:
   * intuit-signature=<base64-encoded-hmac>
   *
   * @param signatureHeader - Value of 'intuit-signature' header
   * @returns Extracted signature value or null
   */
  private extractSignatureValue(signatureHeader: string): string | null {
    if (!signatureHeader) {
      return null;
    }

    // Remove 'intuit-signature=' prefix if present
    const prefix = 'intuit-signature=';
    if (signatureHeader.startsWith(prefix)) {
      return signatureHeader.substring(prefix.length);
    }

    // If no prefix, assume entire header is the signature
    return signatureHeader;
  }

  /**
   * Compute HMAC-SHA256 signature
   *
   * @param payload - Raw webhook payload (string)
   * @param verifierToken - Webhook verifier token
   * @returns Base64-encoded HMAC signature
   */
  private computeSignature(payload: string, verifierToken: string): string {
    const hmac = crypto.createHmac('sha256', verifierToken);
    hmac.update(payload);
    return hmac.digest('base64');
  }

  /**
   * Timing-safe string comparison
   *
   * Prevents timing attacks by ensuring comparison takes constant time
   * regardless of where strings differ.
   *
   * @param a - First string
   * @param b - Second string
   * @returns True if strings are equal
   */
  private timingSafeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufferA = Buffer.from(a);
    const bufferB = Buffer.from(b);

    return crypto.timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Validate webhook challenge for endpoint verification
   *
   * When setting up a webhook endpoint in QuickBooks, QB sends
   * a challenge string that must be echoed back to verify the endpoint.
   *
   * @param challenge - Challenge string from webhook payload
   * @returns Challenge response object
   */
  validateChallenge(challenge: string): { challenge: string } {
    this.logger.log('Webhook challenge received, responding with echo');
    return { challenge };
  }
}
