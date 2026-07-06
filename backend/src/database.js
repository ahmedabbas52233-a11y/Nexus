const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'nexus.db');
const db = new sqlite3.Database(dbPath);

console.log('SQLite database connected at:', dbPath);

// CRITICAL: Force ALL queries to run sequentially
db.serialize();

// Create tables sequentially
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('entrepreneur', 'investor')),
    avatarUrl TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    isOnline INTEGER DEFAULT 0,
    isVerified INTEGER DEFAULT 0,
    twoFactorEnabled INTEGER DEFAULT 0,
    twoFactorSecret TEXT DEFAULT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    startupName TEXT DEFAULT '',
    pitchSummary TEXT DEFAULT '',
    fundingNeeded TEXT DEFAULT '',
    industry TEXT DEFAULT '',
    location TEXT DEFAULT '',
    foundedYear INTEGER DEFAULT 0,
    teamSize INTEGER DEFAULT 0,
    investmentInterests TEXT DEFAULT '[]',
    investmentStage TEXT DEFAULT '[]',
    portfolioCompanies TEXT DEFAULT '[]',
    totalInvestments INTEGER DEFAULT 0,
    minimumInvestment TEXT DEFAULT '',
    maximumInvestment TEXT DEFAULT '',
    website TEXT DEFAULT '',
    experience TEXT DEFAULT '[]',
    education TEXT DEFAULT '[]',
    preferences TEXT DEFAULT '{"notifications":true,"privacy":"public"}'
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    requesterId INTEGER NOT NULL REFERENCES users(id),
    recipientId INTEGER NOT NULL REFERENCES users(id),
    startTime DATETIME NOT NULL,
    endTime DATETIME NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected')),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    originalName TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    size INTEGER NOT NULL,
    path TEXT NOT NULL,
    ownerId INTEGER NOT NULL REFERENCES users(id),
    uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL CHECK(type IN ('deposit', 'withdraw', 'transfer')),
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed')),
    description TEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;