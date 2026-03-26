import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import mentorRoutes from './routes/mentor.js';
import studentRoutes from './routes/student.js';
import emailRoutes from './routes/email.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/email', emailRoutes);

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

export default app;
