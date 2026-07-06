const db = require('../database');
const path = require('path');

exports.uploadDocument = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const result = db.prepare(
      'INSERT INTO documents (name, originalName, mimeType, size, path, ownerId) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
      req.file.filename,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      req.file.path,
      req.user.id
    );

    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, document: doc });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyDocuments = (req, res) => {
  try {
    const documents = db.prepare('SELECT * FROM documents WHERE ownerId = ? ORDER BY uploadedAt DESC').all(req.user.id);
    res.json({ success: true, count: documents.length, documents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAllDocuments = (req, res) => {
  try {
    const documents = db.prepare(`
      SELECT d.*, u.name as ownerName, u.email as ownerEmail
      FROM documents d
      JOIN users u ON d.ownerId = u.id
      ORDER BY d.uploadedAt DESC
    `).all();
    res.json({ success: true, count: documents.length, documents });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};