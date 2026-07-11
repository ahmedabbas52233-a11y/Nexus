const express = require('express');
const router = express.Router();
const { register, login, getMe, logout, verifyLoginOtp, toggle2FA, forgotPassword, resetPassword, changePassword } = require('../controllers/authController');
const { registerValidation, loginValidation } = require('../middleware/validation');
const { protect } = require('../middleware/auth');

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/2fa/verify-login', verifyLoginOtp);
router.post('/2fa/toggle', protect, toggle2FA);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/change-password', protect, changePassword);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;