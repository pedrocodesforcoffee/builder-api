import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

/**
 * Report Email Service
 *
 * Handles email delivery for scheduled financial reports using nodemailer.
 * Supports SMTP configuration from environment variables.
 *
 * Features:
 * - SMTP transport with configurable settings
 * - Template placeholder replacement ({{reportName}}, {{date}}, {{projectName}})
 * - PDF and Excel attachment support
 * - Multiple recipient support
 * - Comprehensive error logging
 *
 * Configuration (Environment Variables):
 * - SMTP_HOST: SMTP server hostname
 * - SMTP_PORT: SMTP server port (e.g., 587 for TLS)
 * - SMTP_SECURE: Use SSL/TLS (true/false)
 * - SMTP_USER: SMTP authentication username
 * - SMTP_PASS: SMTP authentication password
 * - SMTP_FROM_EMAIL: Sender email address
 * - SMTP_FROM_NAME: Sender name
 */
@Injectable()
export class ReportEmailService {
  private readonly logger = new Logger(ReportEmailService.name);
  private transporter!: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  /**
   * Initialize nodemailer SMTP transport with configuration from environment
   */
  private initializeTransporter(): void {
    const smtpHost = this.configService.get<string>('SMTP_HOST', 'localhost');
    const smtpPort = this.configService.get<number>('SMTP_PORT', 587);
    const smtpSecure = this.configService.get<boolean>('SMTP_SECURE', false);
    const smtpUser = this.configService.get<string>('SMTP_USER', '');
    const smtpPass = this.configService.get<string>('SMTP_PASS', '');

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: smtpUser && smtpPass
        ? {
            user: smtpUser,
            pass: smtpPass,
          }
        : undefined,
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates in development
      },
    });

    this.logger.log(
      `SMTP transport initialized: ${smtpHost}:${smtpPort} (secure: ${smtpSecure})`,
    );
  }

  /**
   * Send report email with attachment
   *
   * @param to - Array of recipient email addresses
   * @param subject - Email subject line (supports placeholders)
   * @param body - Email body text (supports placeholders)
   * @param attachmentBuffer - Report file as Buffer
   * @param filename - Attachment filename (e.g., "Budget-Report-2025-12-10.pdf")
   * @param mimeType - MIME type of attachment (e.g., "application/pdf")
   * @throws Error if email delivery fails
   */
  async sendReportEmail(
    to: string[],
    subject: string,
    body: string,
    attachmentBuffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<void> {
    try {
      const fromEmail = this.configService.get<string>(
        'SMTP_FROM_EMAIL',
        'noreply@bobthebuilder.com',
      );
      const fromName = this.configService.get<string>(
        'SMTP_FROM_NAME',
        'Bob The Builder Reports',
      );

      this.logger.log(
        `Sending report email to ${to.length} recipient(s): ${filename}`,
      );

      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: to.join(', '),
        subject: subject,
        text: body,
        html: this.convertTextToHtml(body),
        attachments: [
          {
            filename: filename,
            content: attachmentBuffer,
            contentType: mimeType,
          },
        ],
      });

      this.logger.log(
        `Email sent successfully to ${to.join(', ')} - Message ID: ${info.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send report email to ${to.join(', ')}:`,
        (error as Error).stack,
      );
      throw new Error(
        `Email delivery failed: ${(error as Error).message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Replace template placeholders in text
   *
   * Supported placeholders:
   * - {{reportName}} - Name of the report
   * - {{date}} - Current date (YYYY-MM-DD)
   * - {{projectName}} - Name of the project
   *
   * @param text - Text containing placeholders
   * @param placeholders - Key-value pairs for replacement
   * @returns Text with placeholders replaced
   */
  private replacePlaceholders(
    text: string,
    placeholders: Record<string, string>,
  ): string {
    let result = text;

    for (const [key, value] of Object.entries(placeholders)) {
      const pattern = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(pattern, value);
    }

    return result;
  }

  /**
   * Convert plain text to basic HTML for better email rendering
   *
   * @param text - Plain text string
   * @returns HTML formatted string
   */
  private convertTextToHtml(text: string): string {
    // Replace newlines with <br> tags and wrap in paragraph
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    const htmlLines = lines.map((line) => `<p>${line}</p>`).join('');

    return `
      <html>
        <body style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">
          ${htmlLines}
        </body>
      </html>
    `;
  }

  /**
   * Verify SMTP connection is working
   * Useful for health checks and debugging
   *
   * @returns Promise<boolean> - True if connection is successful
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection verification failed:', (error as Error).stack);
      return false;
    }
  }
}
