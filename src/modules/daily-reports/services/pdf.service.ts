import { Injectable, Logger } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { DailyReport } from '../entities/daily-report.entity';

/**
 * PDF Service
 * Generates professional PDF reports for daily construction reports
 * Uses PDFKit for document generation
 */
@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  /**
   * Generate comprehensive PDF for a daily report
   */
  async generateDailyReportPdf(report: DailyReport): Promise<Buffer> {
    this.logger.log(`Generating PDF for daily report ${report.id}`);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        this.logger.log(`PDF generated successfully: ${pdfBuffer.length} bytes`);
        resolve(pdfBuffer);
      });
      doc.on('error', (error) => {
        this.logger.error(`PDF generation failed: ${error.message}`);
        reject(error);
      });

      // Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('DAILY CONSTRUCTION REPORT', { align: 'center' });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Report #: ${report.id}`, { align: 'center' });
      doc.moveDown(2);

      // Project and Date Info
      doc.fontSize(12).font('Helvetica-Bold').text('PROJECT INFORMATION');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Project: ${report.project?.name || report.projectId}`);
      doc.text(
        `Date: ${new Date(report.reportDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      );
      doc.text(`Prepared by: ${report.createdBy?.firstName} ${report.createdBy?.lastName}`);
      doc.text(`Status: ${report.status}`);
      doc.moveDown(1.5);

      // Weather Section
      doc.fontSize(12).font('Helvetica-Bold').text('WEATHER CONDITIONS');
      doc.fontSize(10).font('Helvetica');
      doc.text(`Morning: ${report.weatherConditionAm || 'N/A'}`);
      doc.text(`Afternoon: ${report.weatherConditionPm || 'N/A'}`);
      if (report.temperatureLow && report.temperatureHigh) {
        doc.text(
          `Temperature: ${report.temperatureLow}°F - ${report.temperatureHigh}°F`,
        );
      }
      if (report.humidity) {
        doc.text(`Humidity: ${report.humidity}%`);
      }
      if (report.windSpeedMph) {
        doc.text(`Wind: ${report.windSpeedMph} mph`);
      }
      if (report.precipitationInches) {
        doc.text(`Precipitation: ${report.precipitationInches} in`);
      }
      doc.text(`Weather Impact: ${report.weatherImpact || 'NONE'}`);
      if (report.weatherNotes) {
        doc.text(`Notes: ${report.weatherNotes}`);
      }
      doc.moveDown(1.5);

      // Manpower Section
      if (report.manpower?.length) {
        doc.fontSize(12).font('Helvetica-Bold').text('MANPOWER');
        doc.fontSize(10).font('Helvetica');

        const tableTop = doc.y + 10;
        this.drawTableRow(
          doc,
          tableTop,
          ['Trade', 'Company', 'Count', 'Hours', 'OT'],
          [150, 150, 60, 60, 60],
          true,
        );

        let y = tableTop + 20;
        report.manpower.forEach((m) => {
          if (y > 700) {
            doc.addPage();
            y = 50;
          }
          this.drawTableRow(
            doc,
            y,
            [
              m.tradeName,
              m.companyName,
              m.headcount.toString(),
              m.hoursWorked.toString(),
              (m.overtimeHours || 0).toString(),
            ],
            [150, 150, 60, 60, 60],
            false,
          );
          y += 20;
        });

        doc.y = y + 10;
        doc.text(`Total Workers: ${report.totalWorkers}`);
        doc.text(`Total Man-Hours: ${report.totalManHours}`);
        doc.moveDown(1.5);
      }

      // Equipment Section
      if (report.equipment?.length) {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('EQUIPMENT');
        doc.fontSize(10).font('Helvetica');

        report.equipment.forEach((e) => {
          doc.text(
            `• ${e.equipmentName} (${e.quantity}x) - ${e.hoursUsed} hrs used${e.idleHours ? `, ${e.idleHours} hrs idle` : ''}`,
          );
          if (e.operatorName) {
            doc.text(`  Operator: ${e.operatorName}`, { indent: 20 });
          }
        });
        doc.moveDown(1.5);
      }

      // Work Performed Section
      if (report.workLogs?.length) {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('WORK PERFORMED');
        doc.fontSize(10).font('Helvetica');

        report.workLogs.forEach((w) => {
          doc.font('Helvetica-Bold').text(`Location: ${w.location}`);
          doc.font('Helvetica').text(`Activity: ${w.activity}`);
          if (w.percentComplete !== null) {
            doc.text(`Progress: ${w.percentComplete}%`);
          }
          if (w.issues) {
            doc.fillColor('red').text(`Issues: ${w.issues}`).fillColor('black');
          }
          doc.moveDown(0.5);
        });
        doc.moveDown(1);
      }

      // Work Summary
      if (report.workSummary) {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('WORK SUMMARY');
        doc.fontSize(10).font('Helvetica').text(report.workSummary);
        doc.moveDown(1.5);
      }

      // Materials Section
      if (report.materials?.length) {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('MATERIALS');
        doc.fontSize(10).font('Helvetica');

        report.materials.forEach((m) => {
          const delivery = m.isDelivery ? ' (DELIVERED)' : '';
          const installed = m.isInstalled ? ' [INSTALLED]' : '';
          doc.text(
            `• ${m.materialName}: ${m.quantity} ${m.unit}${delivery}${installed}`,
          );
          if (m.supplier) {
            doc.text(`  Supplier: ${m.supplier}`, { indent: 20 });
          }
        });
        doc.moveDown(1.5);
      }

      // Inspections Section
      if (report.inspections?.length) {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('INSPECTIONS');
        doc.fontSize(10).font('Helvetica');

        report.inspections.forEach((i) => {
          doc.text(`• ${i.inspectionType}: ${i.result || 'PENDING'}`);
          doc.text(
            `  Inspector: ${i.inspectorName}${i.inspectorCompany ? ` (${i.inspectorCompany})` : ''}`,
            { indent: 20 },
          );
          if (i.notes) {
            doc.text(`  Notes: ${i.notes}`, { indent: 20 });
          }
          if (i.failedItems) {
            doc
              .fillColor('red')
              .text(`  Failed Items: ${i.failedItems}`, { indent: 20 })
              .fillColor('black');
          }
        });
        doc.moveDown(1.5);
      }

      // Incidents Section (highlighted in red)
      if (report.incidents?.length) {
        if (doc.y > 650) doc.addPage();
        doc
          .fontSize(12)
          .fillColor('red')
          .font('Helvetica-Bold')
          .text('INCIDENTS')
          .fillColor('black');
        doc.fontSize(10).font('Helvetica');

        report.incidents.forEach((i) => {
          doc.text(`• ${i.type} (${i.severity})`);
          doc.text(`  ${i.description}`, { indent: 20 });
          if (i.injuredParty) {
            doc.text(`  Injured: ${i.injuredParty}`, { indent: 20 });
          }
          if (i.oshaRecordable) {
            doc
              .fillColor('red')
              .text('  OSHA RECORDABLE', { indent: 20 })
              .fillColor('black');
          }
          if (i.lostTime) {
            doc
              .fillColor('red')
              .text('  LOST TIME INCIDENT', { indent: 20 })
              .fillColor('black');
          }
        });
        doc.moveDown(1.5);
      }

      // Delays Section
      if (report.delays?.length) {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('DELAYS');
        doc.fontSize(10).font('Helvetica');

        report.delays.forEach((d) => {
          doc.text(
            `• ${d.type}: ${d.hoursLost} hours lost (${d.impact} impact)`,
          );
          doc.text(`  ${d.description}`, { indent: 20 });
          if (d.potentialClaim) {
            doc
              .fillColor('red')
              .font('Helvetica-Bold')
              .text('  ** POTENTIAL CLAIM **', { indent: 20 })
              .font('Helvetica')
              .fillColor('black');
          }
        });
        doc.moveDown(1.5);
      }

      // Visitors Section
      if (report.visitors?.length) {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('VISITORS');
        doc.fontSize(10).font('Helvetica');

        report.visitors.forEach((v) => {
          doc.text(
            `• ${v.visitorName}${v.company ? ` (${v.company})` : ''}${v.purpose ? ` - ${v.purpose}` : ''}`,
          );
          if (v.timeIn || v.timeOut) {
            doc.text(
              `  Time: ${v.timeIn || 'N/A'} - ${v.timeOut || 'N/A'}`,
              { indent: 20 },
            );
          }
        });
        doc.moveDown(1.5);
      }

      // General Notes
      if (report.generalNotes) {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text('NOTES');
        doc.fontSize(10).font('Helvetica').text(report.generalNotes);
        doc.moveDown(1.5);
      }

      // Tomorrow's Plan
      if (report.tomorrowPlan) {
        if (doc.y > 650) doc.addPage();
        doc.fontSize(12).font('Helvetica-Bold').text("TOMORROW'S PLAN");
        doc.fontSize(10).font('Helvetica').text(report.tomorrowPlan);
        doc.moveDown(1.5);
      }

      // Signature
      if (report.signatureData) {
        if (doc.y > 650) doc.addPage();
        doc.moveDown(1);
        doc.fontSize(12).font('Helvetica-Bold').text('SUPERINTENDENT SIGNATURE');
        try {
          // Decode base64 signature
          const base64Data = report.signatureData.includes(',')
            ? report.signatureData.split(',')[1]
            : report.signatureData;
          const signatureBuffer = Buffer.from(base64Data, 'base64');
          doc.image(signatureBuffer, { width: 200, height: 100 });
        } catch (error) {
          this.logger.warn(`Could not render signature: ${error.message}`);
          doc.fontSize(10).font('Helvetica-Oblique').text('[Signature on file]');
        }
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        if (report.signedAt) {
          doc.text(
            `Signed: ${new Date(report.signedAt).toLocaleString('en-US')}`,
          );
        }
      }

      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .font('Helvetica')
          .text(
            `Generated: ${new Date().toLocaleString('en-US')} | Page ${i + 1} of ${pageCount}`,
            50,
            doc.page.height - 50,
            { align: 'center' },
          );
      }

      doc.end();
    });
  }

  /**
   * Draw a table row
   */
  private drawTableRow(
    doc: PDFKit.PDFDocument,
    y: number,
    cells: string[],
    widths: number[],
    isHeader: boolean,
  ): void {
    let x = 50;

    if (isHeader) {
      doc.font('Helvetica-Bold');
    } else {
      doc.font('Helvetica');
    }

    cells.forEach((cell, i) => {
      doc.text(cell, x, y, { width: widths[i], continued: false });
      x += widths[i];
    });
  }
}
