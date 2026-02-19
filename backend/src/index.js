const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const tasksRoutes = require('./routes/tasks');
const taskItemsRoutes = require('./routes/taskItems');
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


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || true, // Allow all in dev, set specific origin in prod
  credentials: true // Allow cookies
}));
app.use(express.json());
app.use(cookieParser());

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/task-items', taskItemsRoutes);
app.use('/api/task-lists', taskListsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/bases', basesRoutes);
app.use('/api/bases/:baseId/views', require('./routes/base-views'));
app.use('/api/calendars', calendarsRoutes);

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
app.use('/api/areas', require('./routes/areas'));
app.use('/api/inbox', inboxRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/system', require('./routes/system'));
app.use('/api/admin', require('./routes/admin'));


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Serve static frontend files
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath, { etag: false, lastModified: false, setHeaders: (res) => { res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate"); res.setHeader("Pragma", "no-cache"); res.setHeader("Expires", "0"); } }));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'Endpoint not found',
      code: 'NOT_FOUND'
    });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// Initialize database then start server
const { initDatabase } = require('./db/schema');

async function start() {
  try {
    await initDatabase();
    console.log('Database initialized successfully');
    app.listen(PORT, () => {
      console.log(`Kanban API server running on port ${PORT}`);
      console.log(`Frontend served from: ${frontendPath}`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
