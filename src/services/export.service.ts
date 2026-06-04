// backend/src/services/export.service.ts
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ExportService {
  private exportsDir: string;

  constructor() {
    this.exportsDir = path.join(__dirname, '../../exports');
    this.ensureExportsDir();
  }

  private ensureExportsDir() {
    if (!fs.existsSync(this.exportsDir)) {
      fs.mkdirSync(this.exportsDir, { recursive: true });
    }
  }

  async exportReport(report: any, format: string): Promise<string> {
    const fileName = `report-${report.id}-${Date.now()}`;
    
    switch (format) {
      case 'pdf':
        return await this.exportToPDF(report, fileName);
      case 'excel':
        return await this.exportToExcel(report, fileName);
      case 'csv':
        return await this.exportToCSV(report, fileName);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private async exportToPDF(report: any, fileName: string): Promise<string> {
    const filePath = path.join(this.exportsDir, `${fileName}.pdf`);
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('Weekly Progress Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'right' });
    doc.moveDown();

    // Student Info
    doc.fontSize(14).font('Helvetica-Bold').text('Student Information');
    doc.fontSize(12).font('Helvetica');
    doc.text(`Name: ${report.student?.name || 'N/A'}`);
    doc.text(`Program: ${report.student?.program || 'N/A'}`);
    doc.text(`Track: ${report.student?.track || 'N/A'}`);
    doc.text(`Mentor: ${report.student?.mentor?.name || 'Not assigned'}`);
    doc.moveDown();

    // Report Period
    doc.fontSize(14).font('Helvetica-Bold').text('Report Period');
    doc.fontSize(12).font('Helvetica');
    doc.text(`Week: ${new Date(report.weekStart).toLocaleDateString()} - ${new Date(report.weekEnd).toLocaleDateString()}`);
    doc.moveDown();

    // Summary
    doc.fontSize(14).font('Helvetica-Bold').text('Summary');
    doc.fontSize(12).font('Helvetica');
    doc.text(report.summary);
    doc.moveDown();

    // Statistics
    doc.fontSize(14).font('Helvetica-Bold').text('Statistics');
    doc.fontSize(12).font('Helvetica');
    doc.text(`Attendance Rate: ${Math.round(report.attendanceRate)}%`);
    if (report.performanceAvg) {
      doc.text(`Average Performance: ${report.performanceAvg.toFixed(1)}/10`);
    }
    doc.text(`Topics Covered: ${report.topicsCovered.length}`);
    doc.moveDown();

    // Topics
    if (report.topicsCovered.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Topics Covered');
      doc.fontSize(12).font('Helvetica');
      report.topicsCovered.forEach((topic: string) => {
        doc.text(`• ${topic}`);
      });
      doc.moveDown();
    }

    // Strengths
    if (report.strengths.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Strengths');
      doc.fontSize(12).font('Helvetica');
      report.strengths.forEach((strength: string) => {
        doc.text(`✓ ${strength}`);
      });
      doc.moveDown();
    }

    // Areas for Improvement
    if (report.areasForImprovement.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Areas for Improvement');
      doc.fontSize(12).font('Helvetica');
      report.areasForImprovement.forEach((area: string) => {
        doc.text(`• ${area}`);
      });
    }

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    });
  }

  private async exportToExcel(report: any, fileName: string): Promise<string> {
    const filePath = path.join(this.exportsDir, `${fileName}.xlsx`);
    const workbook = new ExcelJS.Workbook();
    
    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 25 },
      { header: 'Value', key: 'value', width: 40 }
    ];

    summarySheet.addRows([
      { metric: 'Student Name', value: report.student?.name || 'N/A' },
      { metric: 'Program', value: report.student?.program || 'N/A' },
      { metric: 'Track', value: report.student?.track || 'N/A' },
      { metric: 'Mentor', value: report.student?.mentor?.name || 'Not assigned' },
      { metric: 'Week Start', value: new Date(report.weekStart).toLocaleDateString() },
      { metric: 'Week End', value: new Date(report.weekEnd).toLocaleDateString() },
      { metric: 'Attendance Rate', value: `${Math.round(report.attendanceRate)}%` },
      { metric: 'Average Performance', value: report.performanceAvg?.toFixed(1) || 'N/A' },
      { metric: 'Topics Covered', value: report.topicsCovered.length }
    ]);

    // Topics Sheet
    if (report.topicsCovered.length > 0) {
      const topicsSheet = workbook.addWorksheet('Topics');
      topicsSheet.columns = [
        { header: 'Topic', key: 'topic', width: 40 }
      ];
      topicsSheet.addRows(report.topicsCovered.map((topic: string) => ({ topic })));
    }

    // Strengths Sheet
    if (report.strengths.length > 0) {
      const strengthsSheet = workbook.addWorksheet('Strengths');
      strengthsSheet.columns = [
        { header: 'Strength', key: 'strength', width: 50 }
      ];
      strengthsSheet.addRows(report.strengths.map((strength: string) => ({ strength })));
    }

    // Areas Sheet
    if (report.areasForImprovement.length > 0) {
      const areasSheet = workbook.addWorksheet('Areas for Improvement');
      areasSheet.columns = [
        { header: 'Area', key: 'area', width: 50 }
      ];
      areasSheet.addRows(report.areasForImprovement.map((area: string) => ({ area })));
    }

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  private async exportToCSV(report: any, fileName: string): Promise<string> {
    const filePath = path.join(this.exportsDir, `${fileName}.csv`);
    
    const rows = [
      ['Weekly Progress Report'],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Student Information'],
      ['Name', report.student?.name || 'N/A'],
      ['Program', report.student?.program || 'N/A'],
      ['Track', report.student?.track || 'N/A'],
      ['Mentor', report.student?.mentor?.name || 'Not assigned'],
      [],
      ['Report Period'],
      ['Week Start', new Date(report.weekStart).toLocaleDateString()],
      ['Week End', new Date(report.weekEnd).toLocaleDateString()],
      [],
      ['Statistics'],
      ['Attendance Rate', `${Math.round(report.attendanceRate)}%`],
      ['Average Performance', report.performanceAvg?.toFixed(1) || 'N/A'],
      ['Topics Covered Count', report.topicsCovered.length],
      [],
    ];

    if (report.topicsCovered.length > 0) {
      rows.push(['Topics Covered']);
      report.topicsCovered.forEach((topic: string) => {
        rows.push([topic]);
      });
      rows.push([]);
    }

    if (report.strengths.length > 0) {
      rows.push(['Strengths']);
      report.strengths.forEach((strength: string) => {
        rows.push([strength]);
      });
      rows.push([]);
    }

    if (report.areasForImprovement.length > 0) {
      rows.push(['Areas for Improvement']);
      report.areasForImprovement.forEach((area: string) => {
        rows.push([area]);
      });
    }

    const csv = rows.map(row => row.join(',')).join('\n');
    fs.writeFileSync(filePath, csv);
    return filePath;
  }

  async exportProgress(progress: any[], student: any, format: string): Promise<string> {
    const fileName = `progress-${student.id}-${Date.now()}`;
    const filePath = path.join(this.exportsDir, `${fileName}.${format}`);

    if (format === 'csv') {
      const rows = [
        ['Date', 'Topics', 'Attendance', 'Performance', 'Notes'],
        ...progress.map(p => [
          new Date(p.date).toLocaleDateString(),
          p.topicsCovered.join('; '),
          p.attendanceStatus,
          p.performanceRating || '',
          p.notes || ''
        ])
      ];

      const csv = rows.map(row => row.join(',')).join('\n');
      fs.writeFileSync(filePath, csv);
    }

    return filePath;
  }

  async exportReportToBuffer(report: any): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Header
      doc.fontSize(20).font('Helvetica-Bold').text('Weekly Progress Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'right' });
      doc.moveDown();

      // Student Info
      doc.fontSize(14).font('Helvetica-Bold').text('Student Information');
      doc.fontSize(12).font('Helvetica');
      doc.text(`Name: ${report.student?.name || 'N/A'}`);
      doc.text(`Program: ${report.student?.program?.name || report.student?.program || 'N/A'}`);
      doc.text(`Track: ${report.student?.track?.name || report.student?.track || 'N/A'}`);
      doc.text(`Mentor: ${report.student?.mentor?.name || 'Not assigned'}`);
      doc.moveDown();

      // Report Period
      doc.fontSize(14).font('Helvetica-Bold').text('Report Period');
      doc.fontSize(12).font('Helvetica');
      doc.text(`Week: ${new Date(report.weekStart).toLocaleDateString()} - ${new Date(report.weekEnd).toLocaleDateString()}`);
      doc.moveDown();

      // Summary
      doc.fontSize(14).font('Helvetica-Bold').text('Summary');
      doc.fontSize(12).font('Helvetica');
      doc.text(report.summary);
      doc.moveDown();

      // Statistics
      doc.fontSize(14).font('Helvetica-Bold').text('Statistics');
      doc.fontSize(12).font('Helvetica');
      doc.text(`Attendance Rate: ${Math.round(report.attendanceRate)}%`);
      if (report.performanceAvg) {
        doc.text(`Average Performance: ${report.performanceAvg.toFixed(1)}/10`);
      }
      doc.text(`Topics Covered: ${report.topicsCovered.length}`);
      doc.moveDown();

      // Topics
      if (report.topicsCovered.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Topics Covered');
        doc.fontSize(12).font('Helvetica');
        report.topicsCovered.forEach((topic: string) => {
          doc.text(`• ${topic}`);
        });
        doc.moveDown();
      }

      // Strengths
      if (report.strengths.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Strengths');
        doc.fontSize(12).font('Helvetica');
        report.strengths.forEach((strength: string) => {
          doc.text(`✓ ${strength}`);
        });
        doc.moveDown();
      }

      // Areas for Improvement
      if (report.areasForImprovement.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Areas for Improvement');
        doc.fontSize(12).font('Helvetica');
        report.areasForImprovement.forEach((area: string) => {
          doc.text(`• ${area}`);
        });
      }

      doc.end();
    });
  }
}