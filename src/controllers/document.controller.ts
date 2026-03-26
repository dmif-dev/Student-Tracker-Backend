// backend/src/controllers/document.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';
import { DocumentService } from '../services/document.service.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const documentService = new DocumentService();

export class DocumentController {
  // ==================== Document CRUD ====================

  async uploadDocument(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const {
        title,
        description,
        type,
        program,
        track,
        visibility,
        metadata,
        studentIds
      } = req.body;

      const mentor = req.user?.mentor;

      if (!mentor) {
        return res.status(403).json({ error: 'Only mentors can upload documents' });
      }

      // Create file URL
      const fileUrl = `/uploads/${req.file.filename}`;

      // Parse metadata if provided as string
      let parsedMetadata = metadata;
      if (typeof metadata === 'string') {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch (e) {
          parsedMetadata = {};
        }
      }

      // Create document
      const document = await prisma.document.create({
        data: {
          title,
          description,
          type: type as any,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          fileUrl,
          uploadedById: mentor.id,
          program: program as any,
          track,
          visibility: visibility as any,
          status: 'PUBLISHED',
          metadata: parsedMetadata || {},
          permissions: {
            create: {
              userId: mentor.id,
              userRole: 'MENTOR',
              canView: true,
              canDownload: true,
              grantedBy: mentor.id
            }
          }
        },
        include: {
          uploadedBy: true
        }
      });

      // Grant permissions to selected students
      if (studentIds) {
        const studentIdArray = Array.isArray(studentIds)
          ? studentIds
          : JSON.parse(studentIds as string);

        await documentService.grantBulkPermissions(
          document.id,
          studentIdArray,
          true,
          visibility !== 'MENTOR_ONLY'
        );
      }

      res.status(201).json(document);
    } catch (error) {
      console.error('Upload document error:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }

  async getDocuments(req: AuthRequest, res: Response) {
    try {
      const { program, type, track, search } = req.query;

      let documents;
      if (search) {
        documents = await documentService.searchDocuments(
          search as string,
          { program, type, track }
        );
      } else {
        documents = await documentService.getDocumentsForUser(
          req.user?.id,
          req.user?.role,
          { program, type, track }
        );
      }

      res.json(documents);
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  }

  async getDocumentById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          uploadedBy: {
            select: {
              name: true,
              expertise: true
            }
          },
          permissions: {
            where: req.user?.role === 'STUDENT' ? {
              userId: req.user?.student?.id
            } : undefined
          }
        }
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check access
      const canAccess = await this.checkDocumentAccess(req.user, document);
      if (!canAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const stats = await documentService.getDocumentStats(id);

      res.json({ ...document, stats });
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  }

  async updateDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const document = await prisma.document.findUnique({
        where: { id },
        include: { uploadedBy: true }
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Only uploader or admin can update
      if (req.user?.role !== 'ADMIN' && document.uploadedById !== req.user?.mentor?.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updated = await prisma.document.update({
        where: { id },
        data: updates,
        include: {
          uploadedBy: true
        }
      });

      res.json(updated);
    } catch (error) {
      console.error('Update document error:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  }

  async deleteDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const document = await prisma.document.findUnique({
        where: { id }
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Only uploader or admin can delete
      if (req.user?.role !== 'ADMIN' && document.uploadedById !== req.user?.mentor?.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Delete file from filesystem
      const filePath = path.join(__dirname, '../../uploads', path.basename(document.fileUrl));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete permissions first
      await prisma.documentPermission.deleteMany({
        where: { documentId: id }
      });

      // Delete document
      await prisma.document.delete({
        where: { id }
      });

      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  // ==================== Document Download/View ====================

  async downloadDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const document = await prisma.document.findUnique({
        where: { id },
        include: {
          permissions: {
            where: req.user?.role === 'STUDENT' ? {
              userId: req.user?.student?.id
            } : undefined
          }
        }
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check download permission
      const canDownload = await this.checkDownloadAccess(req.user, document);
      if (!canDownload) {
        return res.status(403).json({ error: 'Download access denied' });
      }

      // Track download
      if (req.user?.role === 'STUDENT' && req.user?.student) {
        await prisma.documentPermission.upsert({
          where: {
            documentId_userId: {
              documentId: id,
              userId: req.user.student.id
            }
          },
          update: {
            canDownload: true
          },
          create: {
            documentId: id,
            userId: req.user.student.id,
            userRole: 'STUDENT',
            canView: true,
            canDownload: true,
            grantedBy: 'system'
          }
        });
      }

      const filePath = path.join(__dirname, '../../uploads', path.basename(document.fileUrl));

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      res.download(filePath, document.fileName);
    } catch (error) {
      console.error('Download document error:', error);
      res.status(500).json({ error: 'Failed to download document' });
    }
  }

  async viewDocument(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const document = await prisma.document.findUnique({
        where: { id }
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      // Check view permission
      const canView = await this.checkDocumentAccess(req.user, document);
      if (!canView) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Track view for students
      if (req.user?.role === 'STUDENT' && req.user?.student) {
        await prisma.documentPermission.upsert({
          where: {
            documentId_userId: {
              documentId: id,
              userId: req.user.student.id
            }
          },
          update: {
            canView: true
          },
          create: {
            documentId: id,
            userId: req.user.student.id,
            userRole: 'STUDENT',
            canView: true,
            canDownload: false,
            grantedBy: 'system'
          }
        });
      }

      const filePath = path.join(__dirname, '../../uploads', path.basename(document.fileUrl));

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }

      // For PDFs, display inline
      if (document.fileType === 'application/pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
      } else {
        res.setHeader('Content-Type', document.fileType);
        res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
      }

      fs.createReadStream(filePath).pipe(res);
    } catch (error) {
      console.error('View document error:', error);
      res.status(500).json({ error: 'Failed to view document' });
    }
  }

  // ==================== Permission Management ====================

  async getDocumentPermissions(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const permissions = await prisma.documentPermission.findMany({
        where: { documentId: id },
        include: {
          student: {
            select: {
              name: true,
              program: true,
              track: true
            }
          }
        }
      });

      res.json(permissions);
    } catch (error) {
      console.error('Get permissions error:', error);
      res.status(500).json({ error: 'Failed to fetch permissions' });
    }
  }

  async grantPermission(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { studentId, canView, canDownload } = req.body;

      const permission = await prisma.documentPermission.upsert({
        where: {
          documentId_userId: {
            documentId: id,
            userId: studentId
          }
        },
        update: {
          canView,
          canDownload
        },
        create: {
          documentId: id,
          userId: studentId,
          userRole: 'STUDENT',
          canView,
          canDownload,
          grantedBy: req.user?.mentor?.id || 'admin'
        }
      });

      res.json(permission);
    } catch (error) {
      console.error('Grant permission error:', error);
      res.status(500).json({ error: 'Failed to grant permission' });
    }
  }

  async revokePermission(req: AuthRequest, res: Response) {
    try {
      const { id, studentId } = req.params;

      await prisma.documentPermission.delete({
        where: {
          documentId_userId: {
            documentId: id,
            userId: studentId
          }
        }
      });

      res.json({ message: 'Permission revoked successfully' });
    } catch (error) {
      console.error('Revoke permission error:', error);
      res.status(500).json({ error: 'Failed to revoke permission' });
    }
  }

  async grantBulkPermissions(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { studentIds, canView = true, canDownload = true } = req.body;

      const result = await documentService.grantBulkPermissions(
        id,
        studentIds,
        canView,
        canDownload
      );

      res.json({
        message: `Granted permissions to ${result.count} students`
      });
    } catch (error) {
      console.error('Bulk grant permissions error:', error);
      res.status(500).json({ error: 'Failed to grant permissions' });
    }
  }

  // ==================== Folder Management ====================

  async createFolder(req: AuthRequest, res: Response) {
    try {
      const folderData = req.body;

      const folder = await prisma.folder.create({
        data: {
          name: folderData.name,
          description: folderData.description,
          program: folderData.program,
          track: folderData.track,
          createdBy: req.user?.mentor?.id || req.user?.id
        }
      });

      res.status(201).json(folder);
    } catch (error) {
      console.error('Create folder error:', error);
      res.status(500).json({ error: 'Failed to create folder' });
    }
  }

  async getFolders(req: AuthRequest, res: Response) {
    try {
      const { program, track } = req.query;

      const where: any = {};
      if (program) where.program = program;
      if (track) where.track = track;

      const folders = await prisma.folder.findMany({
        where,
        include: {
          documents: {
            select: {
              id: true,
              title: true,
              type: true,
              fileSize: true
            }
          },
          _count: {
            select: { documents: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      res.json(folders);
    } catch (error) {
      console.error('Get folders error:', error);
      res.status(500).json({ error: 'Failed to fetch folders' });
    }
  }

  async addDocumentToFolder(req: AuthRequest, res: Response) {
    try {
      const { folderId, documentId } = req.params;

      const folder = await prisma.folder.update({
        where: { id: folderId },
        data: {
          documents: {
            connect: { id: documentId }
          }
        },
        include: {
          documents: true
        }
      });

      res.json(folder);
    } catch (error) {
      console.error('Add document to folder error:', error);
      res.status(500).json({ error: 'Failed to add document to folder' });
    }
  }

  async removeDocumentFromFolder(req: AuthRequest, res: Response) {
    try {
      const { folderId, documentId } = req.params;

      const folder = await prisma.folder.update({
        where: { id: folderId },
        data: {
          documents: {
            disconnect: { id: documentId }
          }
        },
        include: {
          documents: true
        }
      });

      res.json(folder);
    } catch (error) {
      console.error('Remove document from folder error:', error);
      res.status(500).json({ error: 'Failed to remove document from folder' });
    }
  }

  // ==================== Statistics and Reports ====================

  async getDocumentStats(req: AuthRequest, res: Response) {
    try {
      const { program, type } = req.query;

      const where: any = {};
      if (program) where.program = program;
      if (type) where.type = type;

      const [total, byType, byProgram, totalSize] = await Promise.all([
        prisma.document.count({ where }),
        prisma.document.groupBy({
          by: ['type'],
          where,
          _count: true
        }),
        prisma.document.groupBy({
          by: ['program'],
          where,
          _count: true
        }),
        prisma.document.aggregate({
          where,
          _sum: {
            fileSize: true
          }
        })
      ]);

      // Get recent uploads
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentUploads = await prisma.document.count({
        where: {
          ...where,
          createdAt: { gte: thirtyDaysAgo }
        }
      });

      res.json({
        total,
        totalSize: totalSize._sum.fileSize || 0,
        recentUploads,
        byType: byType.reduce((acc, curr) => ({
          ...acc,
          [curr.type.toLowerCase()]: curr._count
        }), {}),
        byProgram: byProgram.reduce((acc, curr) => ({
          ...acc,
          [curr.program.toLowerCase()]: curr._count
        }), {})
      });
    } catch (error) {
      console.error('Get document stats error:', error);
      res.status(500).json({ error: 'Failed to fetch document statistics' });
    }
  }

  // ==================== Helper Methods ====================

  private async checkDocumentAccess(user: any, document: any): Promise<boolean> {
    if (user.role === 'ADMIN') return true;

    if (user.role === 'MENTOR') {
      return document.uploadedById === user.mentor?.id ||
        document.visibility === 'BOTH' ||
        document.visibility === 'MENTOR_ONLY';
    }

    if (user.role === 'STUDENT' && user.student) {
      // Check if student has explicit permission
      const permission = await prisma.documentPermission.findUnique({
        where: {
          documentId_userId: {
            documentId: document.id,
            userId: user.student.id
          }
        }
      });

      return !!permission?.canView ||
        document.visibility === 'BOTH' ||
        document.visibility === 'STUDENT_ONLY';
    }

    return false;
  }

  private async checkDownloadAccess(user: any, document: any): Promise<boolean> {
    if (user.role === 'ADMIN') return true;

    if (user.role === 'MENTOR') {
      return document.uploadedById === user.mentor?.id;
    }

    if (user.role === 'STUDENT' && user.student) {
      const permission = await prisma.documentPermission.findUnique({
        where: {
          documentId_userId: {
            documentId: document.id,
            userId: user.student.id
          }
        }
      });

      return !!permission?.canDownload;
    }

    return false;
  }
}