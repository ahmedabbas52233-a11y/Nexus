const express = require('express');
const router = express.Router();
const { createTransaction, getMyTransactions, updateTransactionStatus } = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');
const { transactionValidation } = require('../middleware/validation');

router.post('/', protect, transactionValidation, createTransaction);
router.get('/', protect, getMyTransactions);
router.put('/:id/status', protect, updateTransactionStatus);

module.exports = router;
