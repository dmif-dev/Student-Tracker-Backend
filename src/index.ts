// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma.js';

// Import routes
import programRoutes from './routes/programs.routes.js';
import progressRoutes from './routes/progress.routes.js';
import reportRoutes from './routes/reports.routes.js';
// Remove authentication middleware for testing
// import { authenticate } from './middleware/auth.middleware.js';

// Add other routes as you create them

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

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

// Routes
app.use('/api/programs', programRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/reports', reportRoutes);

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
});

export default app;