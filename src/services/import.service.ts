// backend/src/services/import.service.ts
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';

export class ImportService {
  async importStudentsFromCSV(fileBuffer: Buffer, createdBy: string) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      students: [] as any[]
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Validate required fields
        if (!row.name || !row.email || !row.program) {
          throw new Error(`Row ${i + 2}: Missing required fields (name, email, program)`);
        }

        // Check if user exists
        let user = await prisma.user.findUnique({
          where: { email: row.email }
        });

        if (!user) {
          const tempPassword = Math.random().toString(36).slice(-8);
          user = await prisma.user.create({
            data: {
              email: row.email,
              password: await bcrypt.hash(tempPassword, 10),
              role: 'STUDENT'
            }
          });
        }

        // Get program
        const program = await prisma.program.findFirst({
          where: { name: { equals: row.program, mode: 'insensitive' } }
        });

        if (!program) {
          throw new Error(`Row ${i + 2}: Invalid program "${row.program}"`);
        }

        // Get or create track
        let track = await prisma.track.findFirst({
          where: {
            name: { equals: row.track || 'General', mode: 'insensitive' },
            programId: program.id
          }
        });

        if (!track && row.track) {
          track = await prisma.track.create({
            data: {
              name: row.track,
              programId: program.id,
              requiresMentor: program.name !== 'PCP'
            }
          });
        }

        // Get mentor if provided
        let mentorId = undefined;
        if (row.mentor) {
          const mentor = await prisma.mentor.findFirst({
            where: { name: { contains: row.mentor, mode: 'insensitive' } }
          });
          if (mentor) mentorId = mentor.id;
        }

        // Create student
        const student = await prisma.student.create({
          data: {
            userId: user.id,
            name: row.name,
            registrationNumber: `DMIF${new Date().getFullYear()}${program.name.replace('-', '')}${Math.floor(Math.random() * 10000)}`,
            programId: program.id,
            trackId: track?.id || '',
            mentorId,
            status: row.status?.toUpperCase() || 'ACTIVE',
            joinDate: row.joinDate ? new Date(row.joinDate) : new Date(),
            lastActive: new Date(),
            phone: row.phone,
            address: row.address,
            progress: 0
          }
        });

        results.success++;
        results.students.push(student);
      } catch (error: any) {
        results.failed++;
        results.errors.push(error.message);
      }
    }

    // Create import job record
    await prisma.bulkImportJob.create({
      data: {
        filename: 'students_import.csv',
        fileSize: fileBuffer.length,
        rowCount: rows.length,
        successCount: results.success,
        errorCount: results.failed,
        status: results.failed === 0 ? 'COMPLETED' : 'COMPLETED',
        errors: results.errors,
        createdBy,
        completedAt: new Date()
      }
    });

    return results;
  }

  async importOutcomesFromCSV(fileBuffer: Buffer, createdBy: string) {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      outcomes: [] as any[]
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.studentEmail || !row.type || !row.title) {
          throw new Error(`Row ${i + 2}: Missing required fields`);
        }

        const student = await prisma.student.findFirst({
          where: {
            user: { email: row.studentEmail }
          },
          include: {
            program: true  // Include the program relation
          }
        });

        if (!student) {
          throw new Error(`Row ${i + 2}: Student not found`);
        }

        // Convert program type string to enum
        // Map from display name to enum value
        let programType: any = student.program.name.replace('-', '_');
        
        // If a program is specified in the CSV, use that instead
        if (row.program) {
          const programMap: Record<string, any> = {
            'G-GMP': 'G_GMP',
            'G-CMP': 'G_CMP',
            'E-TIP': 'E_TIP',
            'PCP': 'PCP'
          };
          programType = programMap[row.program] || student.program.name.replace('-', '_');
        }

        const outcome = await prisma.outcome.create({
          data: {
            type: row.type.toUpperCase(),
            title: row.title,
            description: row.description,
            studentId: student.id,
            mentorId: student.mentorId,
            status: row.status?.toUpperCase() || 'PENDING',
            date: row.date ? new Date(row.date) : new Date(),
            program: programType,
            metadata: {
              journal: row.journal,
              patentNumber: row.patentNumber,
              doi: row.doi
            },
            tags: row.tags ? row.tags.split(',') : []
          }
        });

        results.success++;
        results.outcomes.push(outcome);
      } catch (error: any) {
        results.failed++;
        results.errors.push(error.message);
      }
    }

    return results;
  }
}