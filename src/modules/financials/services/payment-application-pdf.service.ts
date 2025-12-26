import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { PaymentApplication } from '../entities/payment-application.entity';

/**
 * Payment Application PDF Generation Service
 *
 * Generates AIA standard forms:
 * - G702: Application and Certificate for Payment
 * - G703: Continuation Sheet (line item detail)
 *
 * Reference: AIA Documents G702-1992 and G703-1992
 */
@Injectable()
export class PaymentApplicationPdfService {
  private readonly logger = new Logger(PaymentApplicationPdfService.name);

  constructor(
    @InjectRepository(PaymentApplication)
    private readonly payAppRepository: Repository<PaymentApplication>,
  ) {}

  /**
   * Generate AIA G702 form PDF
   *
   * Application and Certificate for Payment
   * This is the summary/cover sheet for the payment application
   *
   * @param paymentApplicationId - Payment application ID
   * @returns PDF as Buffer
   */
  async generateG702(paymentApplicationId: string): Promise<Buffer> {
    this.logger.log(`Generating G702 PDF for payment application ${paymentApplicationId}`);

    const payApp = await this.payAppRepository.findOne({
      where: { id: paymentApplicationId },
      relations: [
        'commitment',
        'sov',
        'project',
        'project.organization',
        'submittedBy',
        'approvedBy',
      ],
    });

    if (!payApp) {
      throw new NotFoundException(
        `Payment application ${paymentApplicationId} not found`,
      );
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('AIA Document G702', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('Application and Certificate for Payment', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text('AIA Document G702-1992', { align: 'center' });
      doc.moveDown(2);

      // Project Information Section
      doc.fontSize(11).font('Helvetica-Bold').text('PROJECT INFORMATION', { underline: true });
      doc.moveDown(0.5);

      const projectInfo = [
        ['Project Name:', payApp.project.name || 'N/A'],
        ['Project Number:', payApp.project.number || 'N/A'],
        ['Owner:', payApp.project.organization?.name || 'N/A'],
        ['Contractor:', payApp.commitment.vendorName || 'N/A'],
        ['Contract Date:', payApp.commitment.createdAt
          ? new Date(payApp.commitment.createdAt).toLocaleDateString()
          : 'N/A'],
      ];

      doc.fontSize(10).font('Helvetica');
      projectInfo.forEach(([label, value]) => {
        doc.text(`${label} ${value}`);
      });
      doc.moveDown(1.5);

      // Application Information Section
      doc.fontSize(11).font('Helvetica-Bold').text('APPLICATION INFORMATION', { underline: true });
      doc.moveDown(0.5);

      const appInfo = [
        ['Application Number:', `#${payApp.applicationNumber}`],
        ['Application Date:', new Date(payApp.applicationDate).toLocaleDateString()],
        ['Period:', `${new Date(payApp.periodStart).toLocaleDateString()} to ${new Date(payApp.periodEnd).toLocaleDateString()}`],
        ['Status:', payApp.status],
      ];

      doc.fontSize(10).font('Helvetica');
      appInfo.forEach(([label, value]) => {
        doc.text(`${label} ${value}`);
      });
      doc.moveDown(1.5);

      // Financial Summary Table
      doc.fontSize(11).font('Helvetica-Bold').text('FINANCIAL SUMMARY', { underline: true });
      doc.moveDown(0.5);

      const summaryItems = [
        ['Original Contract Sum', this.formatCurrency(payApp.commitment.originalAmount)],
        ['', ''],
        ['Total Completed and Stored to Date (Column G)', this.formatCurrency(payApp.totalCompletedAndStored)],
        ['Retainage', this.formatCurrency(payApp.retainageAmount)],
        ['  (@ ' + payApp.retainagePercent.toFixed(2) + '%)', ''],
        ['Total Earned Less Retainage', this.formatCurrency(payApp.totalEarnedLessRetainage)],
        ['Less Previous Certificates for Payment', this.formatCurrency(payApp.previousPayments)],
        ['', ''],
        ['CURRENT PAYMENT DUE', this.formatCurrency(payApp.currentPaymentDue)],
      ];

      const tableTop = doc.y;
      const col1X = 50;
      const col2X = 400;

      doc.fontSize(10);
      summaryItems.forEach(([description, amount], index) => {
        const y = tableTop + (index * 20);

        if (description === 'CURRENT PAYMENT DUE') {
          doc.font('Helvetica-Bold');
          doc.rect(col1X - 5, y - 3, 495, 20).stroke();
        } else {
          doc.font('Helvetica');
        }

        doc.text(description, col1X, y, { width: 340, align: 'left' });
        if (amount) {
          doc.text(amount, col2X, y, { width: 145, align: 'right' });
        }
      });

      doc.moveDown(3);

      // Certification Section
      doc.font('Helvetica-Bold').fontSize(11).text('CONTRACTOR CERTIFICATION', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(9);
      doc.text(
        'The undersigned Contractor certifies that to the best of the Contractor\'s knowledge, ' +
        'information and belief, the Work covered by this Application for Payment has been ' +
        'completed in accordance with the Contract Documents.',
        { align: 'justify' }
      );
      doc.moveDown(1);

      if (payApp.submittedBy) {
        doc.text(`Submitted By: ${payApp.submittedBy.firstName} ${payApp.submittedBy.lastName}`);
        doc.text(`Date: ${payApp.submittedAt ? new Date(payApp.submittedAt).toLocaleDateString() : 'N/A'}`);
      }
      doc.moveDown(2);

      // Architect/Engineer Certification Section
      doc.font('Helvetica-Bold').fontSize(11).text('ARCHITECT/OWNER CERTIFICATION', { underline: true });
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(9);
      doc.text(
        'In accordance with the Contract Documents, based on on-site observations and the data ' +
        'comprising this application, the Architect/Owner certifies to the Owner that to the best ' +
        'of the Architect\'s knowledge, information and belief, the Work has progressed as indicated.',
        { align: 'justify' }
      );
      doc.moveDown(1);

      if (payApp.approvedBy) {
        doc.text(`Approved By: ${payApp.approvedBy.firstName} ${payApp.approvedBy.lastName}`);
        doc.text(`Date: ${payApp.approvedAt ? new Date(payApp.approvedAt).toLocaleDateString() : 'N/A'}`);
      }

      // Footer
      doc.fontSize(8).text(
        `Generated: ${new Date().toLocaleString()}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );

      doc.end();
    });
  }

  /**
   * Generate AIA G703 form PDF
   *
   * Continuation Sheet - Line item detail showing work completed for each SOV item
   *
   * @param paymentApplicationId - Payment application ID
   * @returns PDF as Buffer
   */
  async generateG703(paymentApplicationId: string): Promise<Buffer> {
    this.logger.log(`Generating G703 PDF for payment application ${paymentApplicationId}`);

    const payApp = await this.payAppRepository.findOne({
      where: { id: paymentApplicationId },
      relations: [
        'commitment',
        'sov',
        'sov.items',
        'items',
        'project',
        'project.organization',
      ],
    });

    if (!payApp) {
      throw new NotFoundException(
        `Payment application ${paymentApplicationId} not found`,
      );
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margin: 30,
        layout: 'landscape'
      });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(16).font('Helvetica-Bold').text('AIA Document G703', { align: 'center' });
      doc.fontSize(10).font('Helvetica').text('Continuation Sheet', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(8).text(
        `Application ${payApp.applicationNumber} | ${payApp.project.name} | ${payApp.commitment.vendorName || 'N/A'}`,
        { align: 'center' }
      );
      doc.moveDown(1);

      // Column Headers
      const tableTop = doc.y;
      const rowHeight = 18;
      const fontSize = 8;

      const columns = [
        { header: 'Item', x: 30, width: 40 },
        { header: 'Description', x: 75, width: 180 },
        { header: 'Scheduled Value', x: 260, width: 80 },
        { header: 'Work Completed', x: 345, width: 80 },
        { header: 'Materials Stored', x: 430, width: 80 },
        { header: 'Total This Period', x: 515, width: 80 },
        { header: 'Total to Date', x: 600, width: 80 },
        { header: '% Complete', x: 685, width: 60 },
      ];

      // Draw header row
      doc.fontSize(fontSize).font('Helvetica-Bold');
      columns.forEach((col) => {
        doc.text(col.header, col.x, tableTop, { width: col.width, align: 'center' });
      });

      // Draw header underline
      doc.moveTo(30, tableTop + rowHeight - 2)
         .lineTo(doc.page.width - 30, tableTop + rowHeight - 2)
         .stroke();

      // Draw table rows
      let currentY = tableTop + rowHeight;
      doc.font('Helvetica');

      // Create a map of payment application items by SOV item ID
      const payAppItemsMap = new Map(
        (payApp.items || []).map(item => [item.sovItemId, item])
      );

      let totalScheduled = 0;
      let totalCompletedThisPeriod = 0;
      let totalMaterialsStoredThisPeriod = 0;
      let totalThisPeriod = 0;
      let totalToDate = 0;

      (payApp.sov.items || []).forEach((sovItem) => {
        const payAppItem = payAppItemsMap.get(sovItem.id);

        const scheduledValue = Number(sovItem.scheduledValue) || 0;
        const workCompleted = Number(payAppItem?.workCompletedThisPeriod) || 0;
        const materialsStored = Number(payAppItem?.materialsStoredThisPeriod) || 0;
        const thisPeriodTotal = workCompleted + materialsStored;
        const completedToDate = Number(payAppItem?.totalCompletedAndStored) || 0;
        const percentComplete = scheduledValue > 0
          ? (completedToDate / scheduledValue) * 100
          : 0;

        totalScheduled += scheduledValue;
        totalCompletedThisPeriod += workCompleted;
        totalMaterialsStoredThisPeriod += materialsStored;
        totalThisPeriod += thisPeriodTotal;
        totalToDate += completedToDate;

        // Check if we need a new page
        if (currentY > doc.page.height - 100) {
          doc.addPage({ layout: 'landscape' });
          currentY = 50;
        }

        // Draw row data
        const rowData = [
          { text: sovItem.lineNumber.toString(), x: columns[0].x, width: columns[0].width, align: 'center' },
          { text: sovItem.description, x: columns[1].x, width: columns[1].width, align: 'left' },
          { text: this.formatCurrency(scheduledValue), x: columns[2].x, width: columns[2].width, align: 'right' },
          { text: this.formatCurrency(workCompleted), x: columns[3].x, width: columns[3].width, align: 'right' },
          { text: this.formatCurrency(materialsStored), x: columns[4].x, width: columns[4].width, align: 'right' },
          { text: this.formatCurrency(thisPeriodTotal), x: columns[5].x, width: columns[5].width, align: 'right' },
          { text: this.formatCurrency(completedToDate), x: columns[6].x, width: columns[6].width, align: 'right' },
          { text: percentComplete.toFixed(1) + '%', x: columns[7].x, width: columns[7].width, align: 'center' },
        ];

        rowData.forEach((cell) => {
          doc.text(cell.text, cell.x, currentY, {
            width: cell.width,
            align: cell.align as any,
            lineBreak: false
          });
        });

        currentY += rowHeight;
      });

      // Draw totals row
      doc.moveTo(30, currentY)
         .lineTo(doc.page.width - 30, currentY)
         .stroke();

      currentY += 5;
      doc.font('Helvetica-Bold');

      const totalsData = [
        { text: 'TOTALS', x: columns[1].x, width: columns[1].width, align: 'left' },
        { text: this.formatCurrency(totalScheduled), x: columns[2].x, width: columns[2].width, align: 'right' },
        { text: this.formatCurrency(totalCompletedThisPeriod), x: columns[3].x, width: columns[3].width, align: 'right' },
        { text: this.formatCurrency(totalMaterialsStoredThisPeriod), x: columns[4].x, width: columns[4].width, align: 'right' },
        { text: this.formatCurrency(totalThisPeriod), x: columns[5].x, width: columns[5].width, align: 'right' },
        { text: this.formatCurrency(totalToDate), x: columns[6].x, width: columns[6].width, align: 'right' },
        {
          text: totalScheduled > 0 ? ((totalToDate / totalScheduled) * 100).toFixed(1) + '%' : '0%',
          x: columns[7].x,
          width: columns[7].width,
          align: 'center'
        },
      ];

      totalsData.forEach((cell) => {
        doc.text(cell.text, cell.x, currentY, {
          width: cell.width,
          align: cell.align as any
        });
      });

      // Footer
      doc.font('Helvetica').fontSize(7).text(
        `Generated: ${new Date().toLocaleString()}`,
        0,
        doc.page.height - 30,
        { align: 'center' }
      );

      doc.end();
    });
  }

  /**
   * Format number as currency (USD)
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
