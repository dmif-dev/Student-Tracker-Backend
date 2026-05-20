import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export class AdminSettingsController {
  // --- General Settings ---
  async getGeneralSettings(req: Request, res: Response) {
    try {
      const settings = await prisma.systemSettings.findUnique({
        where: { category: 'general' }
      });
      res.json(settings?.settings || {
        siteName: 'DMIF Student Tracker',
        siteUrl: 'https://tracker.dmif.org',
        timezone: 'UTC+5:30',
        dateFormat: 'YYYY-MM-DD',
        language: 'en',
        maintenanceMode: false,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch general settings' });
    }
  }

  async updateGeneralSettings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const settings = await prisma.systemSettings.upsert({
        where: { category: 'general' },
        update: { settings: req.body, updatedBy: userId },
        create: { category: 'general', settings: req.body, updatedBy: userId }
      });
      console.log(`\n[SETTINGS] ⚙️ General settings updated by User ID: ${userId || 'unknown'}`);
      console.log(`[SETTINGS] New General Settings:`, req.body);
      res.json(settings.settings);
    } catch (error) {
      console.error('❌ Failed to update general settings:', error);
      res.status(500).json({ error: 'Failed to update general settings' });
    }
  }

  // --- Notification Settings ---
  async getNotificationSettings(req: Request, res: Response) {
    try {
      const settings = await prisma.systemSettings.findUnique({
        where: { category: 'notifications' }
      });
      res.json(settings?.settings || {
        emailNotifications: true,
        pushNotifications: true,
        weeklyReports: true,
        dailyReminders: false,
        outcomeAlerts: true,
        mentorUpdates: true,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch notification settings' });
    }
  }

  async updateNotificationSettings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const settings = await prisma.systemSettings.upsert({
        where: { category: 'notifications' },
        update: { settings: req.body, updatedBy: userId },
        create: { category: 'notifications', settings: req.body, updatedBy: userId }
      });
      console.log(`\n[SETTINGS] 🔔 Notification settings updated by User ID: ${userId || 'unknown'}`);
      console.log(`[SETTINGS] New Notification Settings:`, req.body);
      res.json(settings.settings);
    } catch (error) {
      console.error('❌ Failed to update notification settings:', error);
      res.status(500).json({ error: 'Failed to update notification settings' });
    }
  }

  // --- Security Settings ---
  async getSecuritySettings(req: Request, res: Response) {
    try {
      const settings = await prisma.systemSettings.findUnique({
        where: { category: 'security' }
      });
      res.json(settings?.settings || {
        twoFactorEnabled: false,
        sessionTimeout: '30',
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          expiryDays: 90
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch security settings' });
    }
  }

  async updateSecuritySettings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const settings = await prisma.systemSettings.upsert({
        where: { category: 'security' },
        update: { settings: req.body, updatedBy: userId },
        create: { category: 'security', settings: req.body, updatedBy: userId }
      });
      console.log(`\n[SETTINGS] 🛡️ Security settings updated by User ID: ${userId || 'unknown'}`);
      console.log(`[SETTINGS] New Security Settings:`, req.body);
      res.json(settings.settings);
    } catch (error) {
      console.error('❌ Failed to update security settings:', error);
      res.status(500).json({ error: 'Failed to update security settings' });
    }
  }

  // --- Users & Roles Management ---
  async getUsers(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          lastLogin: true,
          student: { select: { name: true } },
          mentor: { select: { name: true } },
          adminProfile: { select: { name: true } }
        }
      });
      // Map it to simple user object
      const formatted = users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.isActive ? 'active' : 'inactive',
        lastLogin: u.lastLogin,
        name: u.adminProfile?.name || u.mentor?.name || u.student?.name || 'Unknown'
      }));
      res.json(formatted);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  }

  async createUser(req: Request, res: Response) {
    try {
      const { email, password, role, name } = req.body;
      
      const userData: any = {
        email,
        password: password || 'default-password-needs-change',
        role,
        isActive: true,
      };

      // Depending on the role, create the corresponding profile so the name is saved
      if (role === 'ADMIN') {
        userData.adminProfile = { create: { name: name || 'New Admin' } };
      } else if (role === 'MENTOR') {
        userData.mentor = { 
          create: { 
            name: name || 'New Mentor',
            expertise: [],
            programs: [],
            joinDate: new Date()
          } 
        };
      } else if (role === 'STUDENT') {
        // Students require programId, trackId, etc. We find the first default program and track in the DB to create it.
        const defaultProgram = await prisma.program.findFirst();
        const defaultTrack = defaultProgram ? await prisma.track.findFirst({ where: { programId: defaultProgram.id } }) : null;
        if (defaultProgram && defaultTrack) {
          userData.student = {
            create: {
              name: name || 'New Student',
              registrationNumber: `REG-${Math.floor(100000 + Math.random() * 900000)}`,
              programId: defaultProgram.id,
              trackId: defaultTrack.id,
              joinDate: new Date(),
              status: 'PENDING'
            }
          };
        }
      }

      const user = await prisma.user.create({
        data: userData
      });
      console.log(`\n[USERS] 👤 Created new user: ${email} (${role}) - Profile Name: ${name}`);
      res.status(201).json(user);
    } catch (error) {
      console.error('❌ Failed to create user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { email } = req.body;
      const user = await prisma.user.update({
        where: { id },
        data: { email }
      });
      console.log(`\n[USERS] 👤 Updated user ID: ${id} with new email: ${email}`);
      res.json(user);
    } catch (error) {
      console.error('❌ Failed to update user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  }

  async updateUserRole(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const user = await prisma.user.update({
        where: { id },
        data: { role }
      });
      console.log(`\n[USERS] 👤 Updated user ID: ${id} to new role: ${role}`);
      res.json(user);
    } catch (error) {
      console.error('❌ Failed to update user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }

  async updateUserStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = await prisma.user.update({
        where: { id },
        data: { isActive: status === 'active' }
      });
      console.log(`\n[USERS] 👤 Updated user ID: ${id} status to: ${status}`);
      res.json(user);
    } catch (error) {
      console.error('❌ Failed to update user status:', error);
      res.status(500).json({ error: 'Failed to update user status' });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await prisma.$transaction(async (tx) => {
        // Delete related profiles if they exist
        await tx.admin.deleteMany({ where: { userId: id } });
        await tx.student.deleteMany({ where: { userId: id } });
        await tx.mentor.deleteMany({ where: { userId: id } });
        
        // Delete other common relations that lack onDelete: Cascade
        await tx.userSession.deleteMany({ where: { userId: id } });
        await tx.userActivity.deleteMany({ where: { userId: id } });

        // Finally delete the user
        await tx.user.delete({
          where: { id }
        });
      });

      console.log(`\n[USERS] 👤 Deleted user ID: ${id}`);
      res.json({ message: 'User deleted' });
    } catch (error) {
      console.error('❌ Failed to delete user:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  }

  // --- Email Templates ---
  async getEmailTemplates(req: Request, res: Response) {
    try {
      let templates = await prisma.emailTemplate.findMany();
      
      // Auto-seed default templates if none exist
      if (templates.length === 0) {
        const baseLayout = (content: string) => `
<div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
    <div style="background-color: #ea580c; padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">DMIF Student Tracker</h1>
    </div>
    <div style="padding: 40px 32px; color: #374151; line-height: 1.6; font-size: 16px;">
      ${content}
    </div>
    <div style="background-color: #f3f4f6; padding: 24px; text-align: center; color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0;">© 2026 DMIF Learning Platform. All rights reserved.</p>
      <p style="margin: 6px 0 0 0;">Empowering the next generation of innovators.</p>
    </div>
  </div>
</div>`;

        const defaultTemplates = [
          {
            name: 'Welcome Email',
            subject: 'Welcome to DMIF Student Tracker, [Student Name]!',
            body: baseLayout(`
              <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">Welcome to the Platform! 🎉</h2>
              <p style="margin-bottom: 16px;">Dear <strong>[Student Name]</strong>,</p>
              <p style="margin-bottom: 20px;">We are thrilled to welcome you to the DMIF Student Tracker. Your journey towards excellence starts right now.</p>
              <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-weight: 600; color: #9a3412;">Quick Start Guide:</p>
                <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #c2410c;">
                  <li>Track your daily progress and milestones</li>
                  <li>Review comprehensive weekly reports</li>
                  <li>Connect directly with your mentor</li>
                </ul>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="[Login Link]" style="display: inline-block; padding: 14px 28px; background-color: #ea580c; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; transition: background-color 0.2s;">Login to Dashboard</a>
              </div>
              <p style="margin-bottom: 0;">Best regards,<br/><strong style="color: #111827;">The DMIF Team</strong></p>
            `),
            variables: ['[Student Name]', '[Mentor Name]', '[Program]', '[Track]', '[Login Link]']
          },
          {
            name: 'Password Reset',
            subject: 'Password Reset Request',
            body: baseLayout(`
              <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">Password Reset</h2>
              <p style="margin-bottom: 16px;">Hello <strong>[Student Name]</strong>,</p>
              <p style="margin-bottom: 24px;">We received a request to reset your password for your DMIF account. Click the button below to set a new, secure password:</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="[Reset Link]" style="display: inline-block; padding: 14px 28px; background-color: #ea580c; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset My Password</a>
              </div>
              <p style="margin-bottom: 16px; font-size: 14px; color: #6b7280;">If you did not request this change, you can safely ignore this email. Your password will remain unchanged.</p>
              <p style="margin-bottom: 0;">Best regards,<br/><strong style="color: #111827;">The DMIF Team</strong></p>
            `),
            variables: ['[Student Name]', '[Reset Link]']
          },
          {
            name: 'Weekly Report',
            subject: 'Your Weekly Progress Report',
            body: baseLayout(`
              <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">Weekly Progress Snapshot 📊</h2>
              <p style="margin-bottom: 16px;">Hello <strong>[Student Name]</strong>,</p>
              <p style="margin-bottom: 20px;">Your weekly progress report for the <strong>[Program]</strong> program has been generated.</p>
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px 0; color: #166534; font-size: 18px;">Tasks Completed</h3>
                <span style="font-size: 32px; font-weight: 800; color: #15803d;">[Progress]</span>
              </div>
              <p style="margin-bottom: 24px;">Keep pushing forward! Consistent effort is the key to unlocking your full potential.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="[Dashboard Link]" style="display: inline-block; padding: 14px 28px; background-color: #ea580c; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">View Full Report</a>
              </div>
              <p style="margin-bottom: 0;">Best regards,<br/><strong style="color: #111827;">The DMIF Team</strong></p>
            `),
            variables: ['[Student Name]', '[Progress]', '[Program]', '[Dashboard Link]']
          },
          {
            name: 'Mentor Assignment',
            subject: 'You have been assigned a mentor!',
            body: baseLayout(`
              <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">New Mentor Assigned 🤝</h2>
              <p style="margin-bottom: 16px;">Dear <strong>[Student Name]</strong>,</p>
              <p style="margin-bottom: 20px;">We have great news! You have been carefully paired with a new mentor for the <strong>[Track]</strong> track.</p>
              <div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; border-left: 4px solid #ea580c; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 15px; color: #9a3412;">Your Mentor:</p>
                <p style="margin: 4px 0 0 0; font-size: 20px; font-weight: 700; color: #ea580c;">[Mentor Name]</p>
              </div>
              <p style="margin-bottom: 24px;">We encourage you to log into the platform and send them a quick introductory message to schedule your first session.</p>
              <p style="margin-bottom: 0;">Best regards,<br/><strong style="color: #111827;">The DMIF Team</strong></p>
            `),
            variables: ['[Student Name]', '[Mentor Name]', '[Track]']
          },
          {
            name: 'Session Reminder',
            subject: 'Reminder: Upcoming Mentoring Session',
            body: baseLayout(`
              <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">Session Reminder ⏰</h2>
              <p style="margin-bottom: 16px;">Hi <strong>[Student Name]</strong>,</p>
              <p style="margin-bottom: 20px;">This is a friendly reminder that you have an upcoming mentoring session.</p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding-bottom: 12px; color: #6b7280; font-weight: 500; width: 100px;">Mentor:</td>
                    <td style="padding-bottom: 12px; font-weight: 600; color: #111827;">[Mentor Name]</td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 12px; color: #6b7280; font-weight: 500;">Date:</td>
                    <td style="padding-bottom: 12px; font-weight: 600; color: #111827;">[Session Date]</td>
                  </tr>
                  <tr>
                    <td style="color: #6b7280; font-weight: 500;">Time:</td>
                    <td style="font-weight: 600; color: #111827;">[Session Time]</td>
                  </tr>
                </table>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="[Meeting Link]" style="display: inline-block; padding: 14px 28px; background-color: #ea580c; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Join Meeting Room</a>
              </div>
              <p style="margin-bottom: 0;">Best regards,<br/><strong style="color: #111827;">The DMIF Team</strong></p>
            `),
            variables: ['[Student Name]', '[Mentor Name]', '[Session Date]', '[Session Time]', '[Meeting Link]']
          },
          {
            name: 'Outcome Achieved',
            subject: 'Congratulations on your achievement!',
            body: baseLayout(`
              <div style="text-align: center; margin-bottom: 24px;">
                <span style="font-size: 48px;">🌟</span>
              </div>
              <h2 style="color: #111827; font-size: 24px; font-weight: 800; text-align: center; margin-top: 0; margin-bottom: 20px;">Achievement Unlocked!</h2>
              <p style="margin-bottom: 16px; text-align: center;">Massive congratulations to you, <strong>[Student Name]</strong>!</p>
              <p style="margin-bottom: 24px; text-align: center;">You have successfully achieved a new milestone in the <strong>[Program]</strong> program.</p>
              <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.3);">
                <p style="margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; opacity: 0.9;">Milestone Unlocked</p>
                <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: 800;">[Outcome Name]</p>
              </div>
              <p style="margin-bottom: 0; text-align: center;">We are incredibly proud of your hard work and dedication.<br/><br/><strong style="color: #111827;">The DMIF Team</strong></p>
            `),
            variables: ['[Student Name]', '[Outcome Name]', '[Program]']
          },
          {
            name: 'New Document Uploaded',
            subject: 'New Learning Material Available: [Document Title]',
            body: baseLayout(`
              <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin-top: 0; margin-bottom: 20px;">New Material Available 📚</h2>
              <p style="margin-bottom: 16px;">Hi <strong>[Student Name]</strong>,</p>
              <p style="margin-bottom: 20px;">A new learning resource has been published to the <strong>[Program]</strong> workspace by [Uploader Name].</p>
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px; display: flex; align-items: center;">
                <div style="background-color: #e2e8f0; padding: 12px; border-radius: 6px; margin-right: 16px;">
                  📄
                </div>
                <div>
                  <p style="margin: 0; font-weight: 600; color: #0f172a;">[Document Title]</p>
                  <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b;">Ready for review</p>
                </div>
              </div>
              <div style="text-align: center; margin: 32px 0;">
                <a href="[Document Link]" style="display: inline-block; padding: 14px 28px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600;">Access Document</a>
              </div>
              <p style="margin-bottom: 0;">Best regards,<br/><strong style="color: #111827;">The DMIF Team</strong></p>
            `),
            variables: ['[Student Name]', '[Document Title]', '[Program]', '[Uploader Name]', '[Document Link]']
          }
        ];

        await prisma.emailTemplate.createMany({
          data: defaultTemplates
        });
        
        templates = await prisma.emailTemplate.findMany();
      }
      
      res.json(templates);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch email templates' });
    }
  }

  async getEmailTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const template = await prisma.emailTemplate.findUnique({ where: { id } });
      res.json(template);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch email template' });
    }
  }

  async updateEmailTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { subject, body } = req.body;
      const template = await prisma.emailTemplate.update({
        where: { id },
        data: { subject, body }
      });
      console.log(`\n[EMAIL] 📧 Updated email template ID: ${id} - Subject: "${subject}"`);
      res.json(template);
    } catch (error) {
      console.error('❌ Failed to update email template:', error);
      res.status(500).json({ error: 'Failed to update email template' });
    }
  }

  // --- API Keys ---
  async getApiKeys(req: Request, res: Response) {
    try {
      const keys = await prisma.apiKey.findMany();
      res.json(keys);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch API keys' });
    }
  }

  async createApiKey(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const { name } = req.body;
      const key = `ak_${Math.random().toString(36).substring(2, 15)}`; // simple random string
      const apiKey = await prisma.apiKey.create({
        data: {
          name,
          key,
          createdBy: userId
        }
      });
      console.log(`\n[API KEYS] 🔑 Created new API key: "${name}" for User ID: ${userId || 'unknown'}`);
      res.status(201).json(apiKey);
    } catch (error) {
      console.error('❌ Failed to create API key:', error);
      res.status(500).json({ error: 'Failed to create API key' });
    }
  }

  async deleteApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.apiKey.delete({ where: { id } });
      console.log(`\n[API KEYS] 🔑 Revoked/Deleted API key ID: ${id}`);
      res.json({ message: 'API key deleted' });
    } catch (error) {
      console.error('❌ Failed to delete API key:', error);
      res.status(500).json({ error: 'Failed to delete API key' });
    }
  }

  // --- Backups ---
  async getBackups(req: Request, res: Response) {
    try {
      const backups = await prisma.backup.findMany({ orderBy: { createdAt: 'desc' } });
      res.json(backups);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch backups' });
    }
  }

  async createBackup(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      // In a real scenario, this would trigger a database dump
      const backup = await prisma.backup.create({
        data: {
          fileName: `backup_${Date.now()}.sql`,
          fileSize: 1024 * 1024 * 5, // mock size 5MB
          fileUrl: '/mock/url/backup.sql',
          type: 'MANUAL',
          createdBy: userId,
          status: 'COMPLETED'
        }
      });
      console.log(`\n[BACKUP] 💾 Created manual backup: ${backup.fileName} by User ID: ${userId || 'unknown'}`);
      res.status(201).json(backup);
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  }

  async restoreBackup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Real scenario: stop connections, restore dump, restart.
      // Here we just mock it.
      console.log(`\n[BACKUP] 🔄 Restoring database from backup ID: ${id}...`);
      res.json({ message: `Restored from backup ${id}` });
    } catch (error) {
      console.error('❌ Failed to restore backup:', error);
      res.status(500).json({ error: 'Failed to restore backup' });
    }
  }



  async deleteBackup(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await prisma.backup.delete({ where: { id } });
      console.log(`\n[BACKUP] 💾 Deleted backup file ID: ${id}`);
      res.json({ message: 'Backup deleted' });
    } catch (error) {
      console.error('❌ Failed to delete backup:', error);
      res.status(500).json({ error: 'Failed to delete backup' });
    }
  }

  // --- Backup Settings ---
  async getBackupSettings(req: Request, res: Response) {
    try {
      const settings = await prisma.systemSettings.findUnique({
        where: { category: 'backup' }
      });
      res.json(settings?.settings || {
        autoBackupEnabled: true,
        backupFrequency: 'daily',
        retentionPeriod: '30'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch backup settings' });
    }
  }

  async updateBackupSettings(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id;
      const settings = await prisma.systemSettings.upsert({
        where: { category: 'backup' },
        update: { settings: req.body, updatedBy: userId },
        create: { category: 'backup', settings: req.body, updatedBy: userId }
      });
      console.log(`\n[BACKUP] ⚙️ Backup configuration updated by User ID: ${userId || 'unknown'}`);
      console.log(`[BACKUP] New Backup Configuration:`, req.body);
      res.json(settings.settings);
    } catch (error) {
      console.error('❌ Failed to update backup settings:', error);
      res.status(500).json({ error: 'Failed to update backup settings' });
    }
  }
}
