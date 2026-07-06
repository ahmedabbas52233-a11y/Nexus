const express = require('express');
const router = express.Router();
const { createTransaction, getMyTransactions, updateTransactionStatus } = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createTransaction);
router.get('/', protect, getMyTransactions);
router.put('/:id/status', protect, updateTransactionStatus);

module.exports = router;