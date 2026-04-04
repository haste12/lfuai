const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const chatRoutes = require('./routes/chat');
const userRoutes = require('./routes/users');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// ─── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
