const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

// Initialize database
const db = require('./database');

// Route files
const auth = require('./routes/auth');
const profiles = require('./routes/profiles');
const meetings = require('./routes/meetings');
const documents = require('./routes/documents');
const transactions = require('./routes/transactions');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend.vercel.app'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(morgan('dev'));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Mount routers
app.use('/api/auth', auth);
app.use('/api/profiles', profiles);
app.use('/api/meetings', meetings);
app.use('/api/documents', documents);
app.use('/api/transactions', transactions);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Nexus API is running', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Something went wrong!' });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`Database: SQLite (nexus.db)`);
  console.log(`API Endpoints:`);
  console.log(`  POST /api/auth/register`);
  console.log(`  POST /api/auth/login`);
  console.log(`  GET  /api/auth/me`);
  console.log(`  GET  /api/profiles`);
  console.log(`  GET  /api/profiles/me`);
  console.log(`  POST /api/meetings`);
  console.log(`  GET  /api/meetings`);
  console.log(`  POST /api/documents/upload`);
  console.log(`  POST /api/transactions`);
});