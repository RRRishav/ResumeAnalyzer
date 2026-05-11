const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { mongoose, initDB } = require('./config/db');
const { checkOllamaHealth } = require('./services/ollamaService');

const authRoutes = require('./routes/authRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const extractRoutes = require('./routes/extractRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

const app = express();
const server = http.createServer(app);

const configuredOrigins = process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173';
const allowedOrigins = configuredOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedVercelOrigin = (origin) => {
  try {
    return new URL(origin).hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
};

const corsOrigin = (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin) || isAllowedVercelOrigin(origin)) {
    return callback(null, true);
  }

  return callback(new Error(`CORS blocked origin: ${origin}`));
};

// Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

// Make io accessible in routes
app.set('io', io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const requireDB = (req, res, next) => {
  if (req.originalUrl === '/api/health' || req.originalUrl === '/api/extract/health') {
    return next();
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database unavailable',
      message: 'MongoDB is not connected. Check MONGO_URI and the MongoDB Atlas IP whitelist.',
    });
  }

  return next();
};

app.use('/api/auth', requireDB);
app.use('/api/resume', requireDB);
app.use('/api/extract', requireDB);
app.use('/api/payment', requireDB);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/extract', extractRoutes);
app.use('/api/payment', paymentRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'resume-analyzer-api' });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'unavailable',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
  }
  if (err.message === 'Only PDF and DOCX files are allowed' || err.message === 'Only PDF, DOCX, DOC, and TXT files are allowed') {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await initDB();

    // Check LLM provider connectivity (non-blocking)
    checkOllamaHealth().then((status) => {
      if (status.healthy) {
        console.log(`🦙 LLM ready — ${status.provider} · model: ${status.model} ✓`);
      } else {
        console.warn(`⚠️  LLM not available: ${status.error}`);
      }
    });

    server.listen(PORT, () => {
      console.log(`\n Server running on http://localhost:${PORT}`);
      console.log(`Socket.io ready`);
      console.log(`CORS enabled for ${process.env.CLIENT_URL || 'http://localhost:5173'}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
