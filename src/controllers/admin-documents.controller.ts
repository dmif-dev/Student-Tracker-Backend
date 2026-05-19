import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { uploadToSupabase } from '../lib/supabaseStorage.js';

export class AdminDocumentsController {
  async getDocuments(req: Request, res: Response) {
    try {
      const documents = await prisma.document.findMany({
        include: {
          permissions: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Format for frontend
      const formattedDocs = documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        type: doc.type.toLowerCase(),
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        fileType: doc.fileType,
        fileUrl: doc.fileUrl,
        uploadedById: doc.uploadedById,
        uploadedBy: 'Mentor', // Ideally join with Mentor table
        program: doc.program.replace('_', '-'),
        track: doc.track,
        visibility: doc.visibility.toLowerCase(),
        status: doc.status.toLowerCase(),
        metadata: doc.metadata,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        permissions: {
          viewStudents: doc.permissions.filter(p => p.userRole === 'STUDENT' && p.canView).map(p => p.userId),
          downloadStudents: doc.permissions.filter(p => p.userRole === 'STUDENT' && p.canDownload).map(p => p.userId),
          viewMentors: doc.permissions.filter(p => p.userRole === 'MENTOR' && p.canView).map(p => p.userId),
          downloadMentors: doc.permissions.filter(p => p.userRole === 'MENTOR' && p.canDownload).map(p => p.userId),
        }
      }));

      res.json(formattedDocs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  }

  async uploadDocument(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const {
        title, description, type, program, track, mentorId,
        visibility, metadata, permissions
      } = req.body;

      // Parse JSON strings back into objects since FormData sends them as strings
      let parsedMetadata = metadata;
      if (typeof metadata === 'string') {
        try { parsedMetadata = JSON.parse(metadata); } catch { parsedMetadata = {}; }
      }

      let parsedPermissions = permissions;
      if (typeof permissions === 'string') {
        try { parsedPermissions = JSON.parse(permissions); } catch { parsedPermissions = {}; }
      }

      const storagePath = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );

      const adminId = (req as any).user?.id || 'admin';

      const programType = program === 'G-CMP' ? 'G_CMP' : 'E_TIP';
      const docTypeEnum = type === 'learning_material' ? 'LEARNING_MATERIAL' : 
                         type === 'assignment_material' ? 'ASSIGNMENT_MATERIAL' : 'PRE_READING_MATERIAL';
      const visibilityEnum = visibility === 'student_only' ? 'STUDENT_ONLY' :
                             visibility === 'mentor_only' ? 'MENTOR_ONLY' : 'BOTH';

      const document = await prisma.document.create({
        data: {
          title,
          description,
          type: docTypeEnum,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          fileType: req.file.mimetype,
          fileUrl: storagePath,
          uploadedById: mentorId, // Admin MUST supply a valid mentor ID in formData
          program: programType,
          track,
          visibility: visibilityEnum,
          metadata: parsedMetadata || {},
          status: 'PUBLISHED'
        }
      });

      // Insert permissions
      const permData: any[] = [];
      
      if (parsedPermissions?.viewStudents) {
        parsedPermissions.viewStudents.forEach((studentId: string) => {
          permData.push({
            documentId: document.id,
            userId: studentId,
            userRole: 'STUDENT',
            canView: true,
            canDownload: parsedPermissions.downloadStudents?.includes(studentId) || false,
            grantedBy: adminId
          });
        });
      }


      if (permData.length > 0) {
        try {
          await prisma.documentPermission.createMany({
            data: permData,
            skipDuplicates: true
          });
        } catch (permError) {
          // Permissions insert failed (e.g. invalid student IDs), but document was already saved.
          // Log the warning and continue — the document is accessible, permissions can be set later.
          console.warn('[AdminDocuments] Document created successfully but permissions insert failed:', permError);
        }
      }

      res.status(201).json(document);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }

  async updateDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = req.body;
      const document = await prisma.document.update({
        where: { id },
        data
      });
      res.json(document);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  }

  async deleteDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.documentPermission.deleteMany({ where: { documentId: id } });
      await prisma.document.delete({ where: { id } });
      res.json({ message: 'Document deleted' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  async updatePermissions(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { permissions } = req.body;
      const adminId = (req as any).user?.id || 'admin';

      // Wipe old permissions
      await prisma.documentPermission.deleteMany({ where: { documentId: id } });

      // Insert new
      const permData: any[] = [];
      
      if (permissions?.viewStudents) {
        permissions.viewStudents.forEach((studentId: string) => {
          permData.push({
            documentId: id,
            userId: studentId,
            userRole: 'STUDENT',
            canView: true,
            canDownload: permissions.downloadStudents?.includes(studentId) || false,
            grantedBy: adminId
          });
        });
      }

      if (permissions?.viewMentors) {
        permissions.viewMentors.forEach((mId: string) => {
          permData.push({
            documentId: id,
            userId: mId,
            userRole: 'MENTOR',
            canView: true,
            canDownload: permissions.downloadMentors?.includes(mId) || false,
            grantedBy: adminId
          });
        });
      }

      if (permData.length > 0) {
        await prisma.documentPermission.createMany({
          data: permData
        });
      }

      res.json({ message: 'Permissions updated' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update permissions' });
    }
  }

  async trackView(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'admin';
      
      await prisma.userActivity.create({
        data: {
          userId,
          action: 'document_viewed',
          metadata: { documentId: id }
        }
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to track view' });
    }
  }

  async trackDownload(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || 'admin';
      
      await prisma.userActivity.create({
        data: {
          userId,
          action: 'document_downloaded',
          metadata: { documentId: id }
        }
      });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to track download' });
    }
  }
}
