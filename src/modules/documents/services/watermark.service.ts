import { Injectable, BadRequestException } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createCanvas, loadImage, Canvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Watermark position types
 */
enum WatermarkPosition {
  CENTER = 'center',
  DIAGONAL = 'diagonal',
  FOOTER = 'footer',
  HEADER = 'header',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
}

/**
 * Watermark settings interface
 */
interface WatermarkSettings {
  text: string;
  position?: WatermarkPosition;
  opacity?: number;
  fontSize?: number;
  color?: { r: number; g: number; b: number };
  includeRecipientEmail?: boolean;
  includeAccessDate?: boolean;
  recipientEmail?: string;
}

/**
 * Watermark Service
 *
 * Provides watermarking capabilities for PDFs and images.
 * Used to mark documents distributed via share links or transmittals.
 *
 * Features:
 * - PDF watermarking with configurable text, position, opacity
 * - Image watermarking (PNG, JPG)
 * - Dynamic text generation (recipient info, dates, etc.)
 * - Multiple position options (center, diagonal, footer)
 * - Transparency control
 */
@Injectable()
export class WatermarkService {

  /**
   * Add watermark to PDF file
   *
   * @param pdfBuffer - PDF file buffer
   * @param settings - Watermark settings
   * @returns Watermarked PDF buffer
   */
  async watermarkPdf(
    pdfBuffer: Buffer,
    settings: WatermarkSettings,
  ): Promise<Buffer> {
    try {
      // Load PDF
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();

      // Load font
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Build watermark text
      let watermarkText = settings.text;

      if (settings.includeRecipientEmail && settings.recipientEmail) {
        watermarkText += `\n${settings.recipientEmail}`;
      }

      if (settings.includeAccessDate) {
        const dateStr = new Date().toISOString().split('T')[0];
        watermarkText += `\n${dateStr}`;
      }

      // Default settings
      const opacity = settings.opacity ?? 0.3;
      const fontSize = settings.fontSize ?? 48;
      const color = settings.color ?? { r: 0.5, g: 0.5, b: 0.5 };
      const position = settings.position ?? WatermarkPosition.DIAGONAL;

      // Apply watermark to each page
      for (const page of pages) {
        const { width, height } = page.getSize();

        // Calculate text dimensions
        const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
        const textHeight = fontSize;

        // Calculate position
        let x: number;
        let y: number;
        let rotation: number = 0;

        switch (position) {
          case WatermarkPosition.CENTER:
            x = (width - textWidth) / 2;
            y = height / 2;
            break;

          case WatermarkPosition.DIAGONAL:
            x = width / 2;
            y = height / 2;
            rotation = -45; // 45 degrees counter-clockwise
            break;

          case WatermarkPosition.FOOTER:
            x = (width - textWidth) / 2;
            y = 30;
            break;

          case WatermarkPosition.HEADER:
            x = (width - textWidth) / 2;
            y = height - textHeight - 30;
            break;

          case WatermarkPosition.TOP_RIGHT:
            x = width - textWidth - 30;
            y = height - textHeight - 30;
            break;

          case WatermarkPosition.BOTTOM_LEFT:
            x = 30;
            y = 30;
            break;

          default:
            x = (width - textWidth) / 2;
            y = height / 2;
        }

        // Draw watermark
        page.drawText(watermarkText, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
          opacity,
          rotate: { angle: rotation, type: 0 as any },
        });
      }

      // Save and return
      const watermarkedPdfBytes = await pdfDoc.save();
      return Buffer.from(watermarkedPdfBytes);
    } catch (error) {
      console.error('PDF watermarking error:', error);
      throw new BadRequestException('Failed to add watermark to PDF');
    }
  }

  /**
   * Add watermark to image file
   *
   * @param imageBuffer - Image file buffer
   * @param settings - Watermark settings
   * @param mimeType - Image MIME type (image/png, image/jpeg)
   * @returns Watermarked image buffer
   */
  async watermarkImage(
    imageBuffer: Buffer,
    settings: WatermarkSettings,
    mimeType: string,
  ): Promise<Buffer> {
    try {
      // Load image
      const image = await loadImage(imageBuffer);

      // Create canvas
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext('2d');

      // Draw original image
      ctx.drawImage(image, 0, 0);

      // Build watermark text
      let watermarkText = settings.text;

      if (settings.includeRecipientEmail && settings.recipientEmail) {
        watermarkText += ` | ${settings.recipientEmail}`;
      }

      if (settings.includeAccessDate) {
        const dateStr = new Date().toISOString().split('T')[0];
        watermarkText += ` | ${dateStr}`;
      }

      // Default settings
      const opacity = settings.opacity ?? 0.3;
      const fontSize = settings.fontSize ?? 48;
      const position = settings.position ?? WatermarkPosition.DIAGONAL;

      // Configure text
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.globalAlpha = opacity;

      const color = settings.color ?? { r: 128, g: 128, b: 128 };
      ctx.fillStyle = `rgb(${color.r * 255}, ${color.g * 255}, ${color.b * 255})`;

      // Calculate text dimensions
      const textMetrics = ctx.measureText(watermarkText);
      const textWidth = textMetrics.width;
      const textHeight = fontSize;

      // Calculate position
      let x: number;
      let y: number;

      ctx.save();

      switch (position) {
        case WatermarkPosition.CENTER:
          x = (image.width - textWidth) / 2;
          y = image.height / 2;
          break;

        case WatermarkPosition.DIAGONAL:
          // Rotate canvas for diagonal text
          ctx.translate(image.width / 2, image.height / 2);
          ctx.rotate(-Math.PI / 4); // 45 degrees
          x = -textWidth / 2;
          y = fontSize / 2;
          break;

        case WatermarkPosition.FOOTER:
          x = (image.width - textWidth) / 2;
          y = image.height - 30;
          break;

        case WatermarkPosition.HEADER:
          x = (image.width - textWidth) / 2;
          y = textHeight + 30;
          break;

        case WatermarkPosition.TOP_RIGHT:
          x = image.width - textWidth - 30;
          y = textHeight + 30;
          break;

        case WatermarkPosition.BOTTOM_LEFT:
          x = 30;
          y = image.height - 30;
          break;

        default:
          x = (image.width - textWidth) / 2;
          y = image.height / 2;
      }

      // Draw watermark
      ctx.fillText(watermarkText, x, y);

      ctx.restore();

      // Export based on MIME type
      if (mimeType === 'image/png') {
        return canvas.toBuffer('image/png');
      } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        return canvas.toBuffer('image/jpeg', { quality: 0.95 });
      } else {
        throw new BadRequestException(`Unsupported image type: ${mimeType}`);
      }
    } catch (error) {
      console.error('Image watermarking error:', error);
      throw new BadRequestException('Failed to add watermark to image');
    }
  }

  /**
   * Add watermark to file based on type
   *
   * @param fileBuffer - File buffer
   * @param mimeType - File MIME type
   * @param settings - Watermark settings
   * @returns Watermarked file buffer
   */
  async watermarkFile(
    fileBuffer: Buffer,
    mimeType: string,
    settings: WatermarkSettings,
  ): Promise<Buffer> {
    if (mimeType === 'application/pdf') {
      return this.watermarkPdf(fileBuffer, settings);
    } else if (mimeType.startsWith('image/')) {
      return this.watermarkImage(fileBuffer, settings, mimeType);
    } else {
      throw new BadRequestException(
        `Watermarking not supported for file type: ${mimeType}`,
      );
    }
  }

  /**
   * Check if file type supports watermarking
   *
   * @param mimeType - File MIME type
   * @returns true if watermarking is supported
   */
  supportsWatermarking(mimeType: string): boolean {
    return (
      mimeType === 'application/pdf' ||
      mimeType.startsWith('image/')
    );
  }

  /**
   * Generate standard watermark text for share links
   *
   * @param recipientEmail - Recipient email
   * @param recipientName - Recipient name
   * @param purpose - Share link purpose
   * @returns Watermark text
   */
  generateShareLinkWatermark(
    recipientEmail?: string,
    recipientName?: string,
    purpose?: string,
  ): string {
    const parts: string[] = ['CONFIDENTIAL'];

    if (recipientName) {
      parts.push(recipientName);
    } else if (recipientEmail) {
      parts.push(recipientEmail);
    }

    if (purpose) {
      parts.push(purpose);
    }

    return parts.join(' | ');
  }

  /**
   * Generate standard watermark text for transmittals
   *
   * @param transmittalNumber - Transmittal number
   * @param recipientName - Recipient name
   * @param recipientCompany - Recipient company
   * @returns Watermark text
   */
  generateTransmittalWatermark(
    transmittalNumber: string,
    recipientName?: string,
    recipientCompany?: string,
  ): string {
    const parts: string[] = [transmittalNumber];

    if (recipientName) {
      parts.push(recipientName);
    }

    if (recipientCompany) {
      parts.push(recipientCompany);
    }

    return parts.join(' | ');
  }

  /**
   * Create watermark settings from share link
   *
   * @param shareLink - Share link entity
   * @returns Watermark settings
   */
  createShareLinkWatermarkSettings(shareLink: {
    watermarkSettings?: any;
    recipientName?: string | null;
    recipientEmail?: string | null;
    purpose?: string | null;
  }): WatermarkSettings {
    // Use custom settings if provided
    const custom = shareLink.watermarkSettings || {};

    // Generate default text
    const defaultText = this.generateShareLinkWatermark(
      shareLink.recipientEmail || undefined,
      shareLink.recipientName || undefined,
      shareLink.purpose || undefined,
    );

    return {
      text: custom.text || defaultText,
      position: custom.position || WatermarkPosition.DIAGONAL,
      opacity: custom.opacity || 0.3,
      fontSize: custom.fontSize || 48,
      includeRecipientEmail: custom.includeRecipientEmail ?? true,
      includeAccessDate: custom.includeAccessDate ?? true,
      recipientEmail: shareLink.recipientEmail || undefined,
      color: custom.color || { r: 0.5, g: 0.5, b: 0.5 },
    };
  }

  /**
   * Create watermark settings from transmittal
   *
   * @param transmittal - Transmittal entity
   * @param recipientName - Recipient name
   * @param recipientCompany - Recipient company
   * @returns Watermark settings
   */
  createTransmittalWatermarkSettings(
    transmittal: {
      transmittalNumber: string;
    },
    recipientName?: string,
    recipientCompany?: string,
  ): WatermarkSettings {
    const text = this.generateTransmittalWatermark(
      transmittal.transmittalNumber,
      recipientName,
      recipientCompany,
    );

    return {
      text,
      position: WatermarkPosition.FOOTER,
      opacity: 0.5,
      fontSize: 14,
      includeAccessDate: true,
      color: { r: 0, g: 0, b: 0 },
    };
  }
}
