const db = require('../database');

// Simulates a payment gateway (Stripe/PayPal sandbox-style) settling a transaction
// asynchronously. In a real integration this would be a webhook callback; here we
// mimic that behavior with a short delay so the frontend can show pending -> settled.
function simulateGatewaySettlement(io, transactionId) {
  const delayMs = 1500 + Math.floor(Math.random() * 1500);
  setTimeout(() => {
    // 90% success rate to make the "Failed" state demonstrable too
    const finalStatus = Math.random() < 0.9 ? 'completed' : 'failed';
    db.run('UPDATE transactions SET status = ? WHERE id = ?', [finalStatus, transactionId], (err) => {
      if (err) {
        console.error('Gateway settlement update error:', err);
        return;
      }
      db.get('SELECT * FROM transactions WHERE id = ?', [transactionId], (err, transaction) => {
        if (err || !transaction) return;
        if (io) {
          io.to(`user:${transaction.userId}`).emit('transaction:update', transaction);
        }
      });
    });
  }, delayMs);
}

exports.createTransaction = (req, res) => {
  try {
    const { type, amount, description } = req.body;

    if (!['deposit', 'withdraw', 'transfer'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type must be deposit, withdraw or transfer' });
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'amount must be a positive number' });
    }

    db.run(
      'INSERT INTO transactions (userId, type, amount, description) VALUES (?, ?, ?, ?)',
      [req.user.id, type, numAmount, description || ''],
      function (err) {
        if (err) {
          console.error('Transaction insert error:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        db.get('SELECT * FROM transactions WHERE id = ?', [this.lastID], (err, transaction) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
          }
          res.status(201).json({ success: true, transaction });
          simulateGatewaySettlement(req.app.get('io'), transaction.id);
        });
      }
    );
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyTransactions = (req, res) => {
  try {
    db.all(
      'SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC',
      [req.user.id],
      (err, transactions) => {
        if (err) {
          console.error('getMyTransactions error:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, count: transactions.length, transactions });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateTransactionStatus = (req, res) => {
  try {
    const { status } = req.body;
    const transactionId = req.params.id;

    if (!['pending', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    db.get('SELECT * FROM transactions WHERE id = ?', [transactionId], (err, transaction) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }
      if (transaction.userId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      db.run('UPDATE transactions SET status = ? WHERE id = ?', [status, transactionId], (err) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        db.get('SELECT * FROM transactions WHERE id = ?', [transactionId], (err, updated) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
          }
          res.json({ success: true, transaction: updated });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
