const db = require('../database');

exports.createTransaction = (req, res) => {
  try {
    const { type, amount, description } = req.body;

    const result = db.prepare(
      'INSERT INTO transactions (userId, type, amount, description) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, type, amount, description || '');

    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, transaction });
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyTransactions = (req, res) => {
  try {
    const transactions = db.prepare('SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC').all(req.user.id);
    res.json({ success: true, count: transactions.length, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateTransactionStatus = (req, res) => {
  try {
    const { status } = req.body;
    const transactionId = req.params.id;

    db.prepare('UPDATE transactions SET status = ? WHERE id = ?').run(status, transactionId);
    const transaction = db.prepare('SELECT * FROM transactions WHERE id = ?').get(transactionId);

    res.json({ success: true, transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};