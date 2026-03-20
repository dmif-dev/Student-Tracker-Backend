// backend/src/services/document.service.ts
import { prisma } from '../lib/prisma.js';
import { DocumentType, ProgramType, UserRole } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DocumentService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async getDocumentsForUser(userId: string, userRole: string, filters?: any) {
    const where: any = {};

    if (filters?.program) {
      where.program = filters.program;
    }
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.track) {
      where.track = filters.track;
    }

    if (userRole === 'STUDENT') {
      // Students can only see documents they have permission to view
      const student = await prisma.student.findUnique({
        where: { userId }
      });

      if (student) {
        where.OR = [
          { visibility: 'BOTH' },
          { visibility: 'STUDENT_ONLY' },
          {
            permissions: {
              some: {
                userId: student.id,
                userRole: 'STUDENT',
                canView: true
              }
            }
          }
        ];
      }
    } else if (userRole === 'MENTOR') {
      // Mentors can see documents they uploaded
      const mentor = await prisma.mentor.findUnique({
        where: { userId }
      });

      if (mentor) {
        where.OR = [
          { uploadedById: mentor.id },
          { visibility: 'BOTH' },
          { visibility: 'MENTOR_ONLY' }
        ];
      }
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            name: true,
            expertise: true
          }
        },
        permissions: {
          where: userRole === 'STUDENT' ? {
            userId: (await prisma.student.findUnique({ where: { userId } }))?.id
          } : undefined
        },
        _count: {
          select: {
            permissions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return documents;
  }

  async getDocumentStats(documentId: string) {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        permissions: true
      }
    });

    if (!document) return null;

    const viewCount = document.permissions.filter(p => p.canView).length;
    const downloadCount = document.permissions.filter(p => p.canDownload).length;

    return {
      id: document.id,
      title: document.title,
      type: document.type,
      fileSize: document.fileSize,
      viewCount,
      downloadCount,
      studentAccessCount: document.permissions.length,
      createdAt: document.createdAt
    };
  }

  async getDocumentsByProgram(program: ProgramType, track?: string) {
    const where: any = { program };
    
    if (track) {
      where.track = track;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            permissions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group by type
    const grouped = {
      learning_materials: documents.filter(d => d.type === 'LEARNING_MATERIAL'),
      assignments: documents.filter(d => d.type === 'ASSIGNMENT_MATERIAL'),
      pre_reading: documents.filter(d => d.type === 'PRE_READING_MATERIAL')
    };

    return {
      program,
      track,
      total: documents.length,
      grouped,
      documents
    };
  }

  async grantBulkPermissions(documentId: string, studentIds: string[], canView: boolean = true, canDownload: boolean = true) {
    const permissions = studentIds.map(studentId => ({
      documentId,
      userId: studentId,
      userRole: UserRole.STUDENT,
      canView,
      canDownload,
      grantedBy: 'system'
    }));

    const result = await prisma.documentPermission.createMany({
      data: permissions,
      skipDuplicates: true
    });

    return result;
  }

  async getDocumentsByStudent(studentId: string) {
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { visibility: 'BOTH' },
          { visibility: 'STUDENT_ONLY' },
          {
            permissions: {
              some: {
                userId: studentId,
                userRole: 'STUDENT'
              }
            }
          }
        ]
      },
      include: {
        uploadedBy: {
          select: {
            name: true
          }
        },
        permissions: {
          where: {
            userId: studentId
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return documents;
  }

  async getDocumentsByMentor(mentorId: string) {
    const documents = await prisma.document.findMany({
      where: {
        uploadedById: mentorId
      },
      include: {
        _count: {
          select: {
            permissions: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return documents;
  }

  async searchDocuments(query: string, filters?: any) {
    const where: any = {
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { fileName: { contains: query, mode: 'insensitive' } }
      ]
    };

    if (filters?.program) {
      where.program = filters.program;
    }
    if (filters?.type) {
      where.type = filters.type;
    }
    if (filters?.track) {
      where.track = filters.track;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return documents;
  }

  async cleanupOldFiles(daysOld: number = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldDocuments = await prisma.document.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: 'ARCHIVED'
      }
    });

    for (const doc of oldDocuments) {
      // Delete file from filesystem
      const filePath = path.join(this.uploadDir, path.basename(doc.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      await prisma.documentPermission.deleteMany({
        where: { documentId: doc.id }
      });
      await prisma.document.delete({
        where: { id: doc.id }
      });
    }

    return oldDocuments.length;
  }
}