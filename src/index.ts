// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma.js';
import { CronService } from './services/cron.service.js';
import { apiLimiter, authLimiter, uploadLimiter } from './middleware/rate-limit.middleware.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import programRoutes from './routes/programs.routes.js';
import progressRoutes from './routes/progress.routes.js';
import reportRoutes from './routes/reports.routes.js';
import sessionRoutes from './routes/session.routes.js';
import documentRoutes from './routes/document.routes.js';
import outcomeRoutes from './routes/outcome.routes.js';
import searchRoutes from './routes/search.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import importRoutes from './routes/import.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import activityRoutes from './routes/activity.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import emailRoutes from './routes/email.js';

// Auth and user routes (using Supabase)
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import studentRoutes from './routes/student.js';

// Unified mentor routes (combines auth and feature APIs)
import mentorRoutes from './routes/mentor.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Initialize cron service
const cronService = new CronService();
cronService.start();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api/upload', uploadLimiter);
app.use('/api', apiLimiter);

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// ==================== API Routes ====================

// Core feature routes
app.use('/api/auth', authRoutes);
app.use('/api/programs', programRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/outcomes', outcomeRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/import', importRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/email', emailRoutes);

// Auth & User routes (Supabase-based)
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/mentor', mentorRoutes);  // Unified mentor routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: prisma ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📝 Health check: http://localhost:${port}/health`);
  console.log(`📚 Programs API: http://localhost:${port}/api/programs`);
  console.log(`📊 Progress API: http://localhost:${port}/api/progress`);
  console.log(`📊 Reports API: http://localhost:${port}/api/reports`);
  console.log(`👨‍🏫 Mentor API: http://localhost:${port}/api/mentor`);
  console.log(`📅 Sessions API: http://localhost:${port}/api/sessions`);
  console.log(`📄 Documents API: http://localhost:${port}/api/documents`);
  console.log(`🏆 Outcomes API: http://localhost:${port}/api/outcomes`);
  console.log(`🔍 Search API: http://localhost:${port}/api/search`);
  console.log(`📊 Dashboard API: http://localhost:${port}/api/dashboard`);
  console.log(`📁 Import API: http://localhost:${port}/api/import`);
  console.log(`📢 Announcements API: http://localhost:${port}/api/announcements`);
  console.log(`📋 Activity API: http://localhost:${port}/api/activities`);
  console.log(`📝 Assignments API: http://localhost:${port}/api/assignments`);
  console.log(`⚙️ Settings API: http://localhost:${port}/api/settings`);
  console.log(`✉️ Email API: http://localhost:${port}/api/email`);
});

export default app;