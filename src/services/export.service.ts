// backend/src/services/export.service.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ExportService {
  async exportProgress(progress: any[], student: any, format: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `progress_${student.name}_${timestamp}.${format}`;
    const filePath = path.join(__dirname, '../../exports', fileName);

    // Ensure exports directory exists
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    if (format === 'csv') {
      await this.exportToCSV(progress, student, filePath);
    } else if (format === 'json') {
      await this.exportToJSON(progress, student, filePath);
    }

    return filePath;
  }

  private async exportToCSV(progress: any[], student: any, filePath: string) {
    const headers = ['Date', 'Topics', 'Notes', 'Attendance', 'Performance'];
    const rows = progress.map(p => [
      new Date(p.date).toLocaleDateString(),
      p.topicsCovered.join('; '),
      p.notes || '',
      p.attendanceStatus,
      p.performanceRating || ''
    ]);

    const csvContent = [
      `Student: ${student.name}`,
      `Registration: ${student.registrationNumber}`,
      '',
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    fs.writeFileSync(filePath, csvContent);
  }

  private async exportToJSON(progress: any[], student: any, filePath: string) {
    const data = {
      student: {
        name: student.name,
        registration: student.registrationNumber,
        program: student.program
      },
      exportDate: new Date().toISOString(),
      progress: progress
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  async exportReport(report: any, format: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `report_${report.id}_${timestamp}.${format}`;
    const filePath = path.join(__dirname, '../../exports', fileName);

    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }

    if (format === 'pdf') {
      // For now, just save as JSON until we implement PDF generation
      fs.writeFileSync(filePath.replace('.pdf', '.json'), JSON.stringify(report, null, 2));
    }

    return filePath;
  }
}