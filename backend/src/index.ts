import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import logger from './lib/logger';
import { errorHandler } from './middleware/errorHandler';

// Import routes (remain as .js — TypeScript resolves them with allowJs)
const authRoutes = require('./routes/auth');
const tasksRoutes = require('./routes/tasks');
const taskListsRoutes = require('./routes/taskLists');
const usersRoutes = require('./routes/users');
const basesRoutes = require('./routes/bases');
const calendarsRoutes = require('./routes/calendars');
const peopleRoutes = require('./routes/people');
const uploadsRoutes = require('./routes/uploads');
const apexJobsRoutes = require('./routes/apexJobs');
const apiKeysRoutes = require('./routes/apiKeys');
const inboxRoutes = require('./routes/inbox');
const dashboardRoutes = require('./routes/dashboard');
const mailRoutes = require('./routes/mail');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Request logging
if (process.env.NODE_ENV !== 'production') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info({ method: req.method, path: req.path }, 'request');
    next();
  });
}

// Health check endpoint (before auth-guarded routes)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/task-lists', taskListsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/bases', basesRoutes);
app.use('/api/bases/:baseId/views', require('./routes/base-views'));
app.use('/api/calendars', calendarsRoutes);
app.use('/api/calendar-events', require('./routes/calendarEvents'));
app.use('/api/people', peopleRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/apex-jobs', apexJobsRoutes);
app.use('/api/apex-orgs', require('./routes/apexOrgs'));
app.use('/api/apex-crm', require('./routes/apexCrm'));
app.use('/api/apex-inventory', require('./routes/apexInventory'));
app.use('/api/apex-workflows', require('./routes/apexWorkflows'));
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/roles', require('./routes/roles'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/apex-docs', require('./routes/apexDocuments'));
app.use('/api/tags', require('./routes/tags'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/milestones', require('./routes/milestones'));
app.use('/api/work-sessions', require('./routes/workSessions'));
app.use('/api/inbox', inboxRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/system', require('./routes/system'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/googleCalendar'));
app.use('/api/weather', require('./routes/weather'));
app.use('/api/feeds', require('./routes/feeds'));

// Serve static frontend files
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath, {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  },
}));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'Endpoint not found',
      code: 'NOT_FOUND',
    });
    return;
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handler (must be after all routes)
app.use(errorHandler);

// Initialize database then start server
const { initDatabase } = require('./db/schema');
const { initFeeds } = require('./db/feeds');

async function start(): Promise<void> {
  try {
    await initDatabase();
    await initFeeds();
    logger.info('Database initialized successfully');
    app.listen(PORT, () => {
      logger.info({ port: PORT, frontendPath }, 'LyfeHub API server running');
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to initialize database');
    process.exit(1);
  }
}

start();

export default app;
