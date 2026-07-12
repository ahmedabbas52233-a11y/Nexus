const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
    });
  }
  next();
};

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['entrepreneur', 'investor']).withMessage('Role must be entrepreneur or investor'),
  handleValidationErrors
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const meetingValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title is too long'),
  body('description').optional().trim().isLength({ max: 2000 }).withMessage('Description is too long'),
  body('recipientId').isInt({ min: 1 }).withMessage('A valid recipientId is required'),
  body('startTime').isISO8601().withMessage('startTime must be a valid date'),
  body('endTime').isISO8601().withMessage('endTime must be a valid date'),
  handleValidationErrors
];

const meetingStatusValidation = [
  body('status').isIn(['pending', 'accepted', 'rejected']).withMessage('Invalid status'),
  handleValidationErrors
];

const transactionValidation = [
  body('type').isIn(['deposit', 'withdraw', 'transfer']).withMessage('type must be deposit, withdraw or transfer'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a positive number'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Description is too long'),
  handleValidationErrors
];

const messageValidation = [
  body('content').trim().notEmpty().withMessage('Message content is required').isLength({ max: 5000 }).withMessage('Message is too long'),
  handleValidationErrors
];

const signatureValidation = [
  body('signature').notEmpty().withMessage('A signature image is required')
    .custom((value) => typeof value === 'string' && value.startsWith('data:image/'))
    .withMessage('signature must be a valid base64 image data URL'),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  meetingValidation,
  meetingStatusValidation,
  transactionValidation,
  messageValidation,
  signatureValidation,
  handleValidationErrors
};