const db = require('../database');
const fs = require('fs');

exports.uploadDocument = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    db.run(
      'INSERT INTO documents (name, originalName, mimeType, size, path, ownerId) VALUES (?, ?, ?, ?, ?, ?)',
      [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.file.path, req.user.id],
      function (err) {
        if (err) {
          console.error('Upload DB error:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        db.get('SELECT * FROM documents WHERE id = ?', [this.lastID], (err, doc) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
          }
          res.status(201).json({ success: true, document: doc });
        });
      }
    );
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyDocuments = (req, res) => {
  try {
    db.all(
      'SELECT * FROM documents WHERE ownerId = ? ORDER BY uploadedAt DESC',
      [req.user.id],
      (err, documents) => {
        if (err) {
          console.error('getMyDocuments error:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, count: documents.length, documents });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAllDocuments = (req, res) => {
  try {
    db.all(
      `SELECT d.*, u.name as ownerName, u.email as ownerEmail
       FROM documents d
       JOIN users u ON d.ownerId = u.id
       ORDER BY d.uploadedAt DESC`,
      [],
      (err, documents) => {
        if (err) {
          console.error('getAllDocuments error:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, count: documents.length, documents });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.signDocument = (req, res) => {
  try {
    const docId = req.params.id;
    const { signature } = req.body; // base64 PNG data URL from the signature pad

    if (!signature || !signature.startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: 'A valid signature image is required' });
    }

    db.get('SELECT * FROM documents WHERE id = ?', [docId], (err, doc) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }

      db.run(
        'UPDATE documents SET signature = ?, signedAt = CURRENT_TIMESTAMP WHERE id = ?',
        [signature, docId],
        (err) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
          }
          db.get('SELECT * FROM documents WHERE id = ?', [docId], (err, updated) => {
            if (err) {
              return res.status(500).json({ success: false, message: 'Database error' });
            }
            res.json({ success: true, document: updated });
          });
        }
      );
    });
  } catch (error) {
    console.error('signDocument error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteDocument = (req, res) => {
  try {
    const docId = req.params.id;

    db.get('SELECT * FROM documents WHERE id = ?', [docId], (err, doc) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (!doc) {
        return res.status(404).json({ success: false, message: 'Document not found' });
      }
      if (doc.ownerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }
      db.run('DELETE FROM documents WHERE id = ?', [docId], (err) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        fs.unlink(doc.path, () => {});
        res.json({ success: true, message: 'Document deleted' });
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
