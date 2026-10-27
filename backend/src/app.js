const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/users');
const knowledgeRoutes = require('./routes/knowledge');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow any localhost port in development
    if (/^http:\/\/localhost:\d+$/.test(origin)) return callback(null, true);
    // Allow configured frontend URL in production
    const allowed = process.env.FRONTEND_URL;
    if (allowed && origin === allowed) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'LFU AI Backend is running',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/chat', chatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/knowledge', knowledgeRoutes);

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start knowledge sync scheduler ──────────────────────────────────────────
// Only runs locally when explicitly enabled — NOT on Vercel serverless
if (process.env.ENABLE_SYNC_SCHEDULER === 'true' && process.env.NODE_ENV !== 'production') {
  try {
    const { startScheduler } = require('./services/syncService');
    startScheduler();
  } catch (err) {
    console.warn('[Scheduler] Could not start scheduler:', err.message);
  }
}

module.exports = app;
