const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// DB_PATH lets production point SQLite at a mounted persistent volume
// (e.g. Fly.io volumes are mounted at /data - see fly.toml). Defaults to
// backend/nexus.db for local development.
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'nexus.db');
const db = new sqlite3.Database(dbPath);

console.log('SQLite database connected at:', dbPath);

// CRITICAL: Enable serialized mode for ALL queries (not inside a block)
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
    resetPasswordToken TEXT DEFAULT NULL,
    resetPasswordExpire DATETIME DEFAULT NULL,
    otpCode TEXT DEFAULT NULL,
    otpExpires DATETIME DEFAULT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Lightweight migration for DBs created before these columns existed
db.all("PRAGMA table_info(users)", [], (err, columns) => {
  if (err) return;
  const names = columns.map(c => c.name);
  const toAdd = [
    ['resetPasswordToken', "TEXT DEFAULT NULL"],
    ['resetPasswordExpire', "DATETIME DEFAULT NULL"],
    ['otpCode', "TEXT DEFAULT NULL"],
    ['otpExpires', "DATETIME DEFAULT NULL"],
    ['twoFactorEnabled', "INTEGER DEFAULT 0"],
    ['twoFactorSecret', "TEXT DEFAULT NULL"],
    ['isVerified', "INTEGER DEFAULT 0"]
  ];
  toAdd.forEach(([col, def]) => {
    if (!names.includes(col)) {
      db.run(`ALTER TABLE users ADD COLUMN ${col} ${def}`);
    }
  });
});

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
    signature TEXT DEFAULT NULL,
    signedAt DATETIME DEFAULT NULL,
    uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.all("PRAGMA table_info(documents)", [], (err, columns) => {
  if (err) return;
  const names = columns.map(c => c.name);
  if (!names.includes('signature')) db.run("ALTER TABLE documents ADD COLUMN signature TEXT DEFAULT NULL");
  if (!names.includes('signedAt')) db.run("ALTER TABLE documents ADD COLUMN signedAt DATETIME DEFAULT NULL");
});

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

db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    senderId INTEGER NOT NULL REFERENCES users(id),
    recipientId INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    isRead INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

module.exports = db;