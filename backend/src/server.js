const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

dotenv.config();

// Ensure uploads directory exists
// UPLOADS_DIR lets production point uploads at a mounted persistent volume
// (e.g. Fly.io volumes are mounted at /data - see fly.toml). Defaults to
// backend/uploads for local development.
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize database
const db = require('./database');

// Route files
const auth = require('./routes/auth');
const profiles = require('./routes/profiles');
const meetings = require('./routes/meetings');
const documents = require('./routes/documents');
const transactions = require('./routes/transactions');
const messages = require('./routes/messages');

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : ['https://your-frontend.vercel.app'])
  : ['http://localhost:5173', 'http://localhost:3000'];

const io = new Server(server, {
  cors: { origin: allowedOrigins, credentials: true }
});
app.set('io', io);
require('./socket')(io);

// Render/Heroku/etc sit behind a reverse proxy - trust the first hop so
// express-rate-limit (and req.ip generally) see the real client IP
// instead of the proxy's IP for every request.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(morgan('dev'));

// Rate limiting - protects auth endpoints from brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { success: false, message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth', authLimiter);

// General API rate limit - more generous, guards against scripted abuse
// (e.g. message/meeting spam) on every other endpoint
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', apiLimiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Strip dangerous HTML/script content from all incoming request bodies
const { sanitizeBody } = require('./middleware/sanitize');
app.use(sanitizeBody);

// Static files for uploads
app.use('/uploads', express.static(uploadsDir));

// Mount routers
app.use('/api/auth', auth);
app.use('/api/profiles', profiles);
app.use('/api/meetings', meetings);
app.use('/api/documents', documents);
app.use('/api/transactions', transactions);
app.use('/api/messages', messages);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Nexus API is running', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  // Multer file-validation errors (bad type / too large) are client input
  // errors, not server faults - respond 400, not 500.
  if (err.name === 'MulterError' || /Invalid file type/.test(err.message || '')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  // Malformed JSON bodies from express.json() are also a client error.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON in request body' });
  }
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Something went wrong!' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Database: SQLite (nexus.db)`);
  console.log(`Socket.IO ready for chat + WebRTC signaling`);
  console.log(`API Endpoints:`);
  console.log(`  POST /api/auth/register`);
  console.log(`  POST /api/auth/login`);
  console.log(`  GET  /api/auth/me`);
  console.log(`  POST /api/auth/forgot-password`);
  console.log(`  POST /api/auth/reset-password/:token`);
  console.log(`  POST /api/auth/2fa/toggle`);
  console.log(`  POST /api/auth/2fa/verify`);
  console.log(`  GET  /api/profiles`);
  console.log(`  GET  /api/profiles/me`);
  console.log(`  POST /api/meetings`);
  console.log(`  GET  /api/meetings`);
  console.log(`  POST /api/documents/upload`);
  console.log(`  POST /api/transactions`);
  console.log(`  GET  /api/messages/conversations`);
});