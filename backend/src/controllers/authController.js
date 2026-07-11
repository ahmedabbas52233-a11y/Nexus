const db = require('../database');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { hashPassword, comparePassword, generateAvatar } = require('../utils/helpers');
const { sendMail } = require('../utils/mailer');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

exports.register = (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, existing) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (existing) {
        return res.status(400).json({ success: false, message: 'User already exists' });
      }

      const hashedPassword = hashPassword(password);
      const avatarUrl = generateAvatar(name);

      db.run(
        'INSERT INTO users (name, email, password, role, avatarUrl) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, role, avatarUrl],
        function(err) {
          if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
          }

          const userId = this.lastID;
          db.run('INSERT INTO profiles (userId) VALUES (?)', [userId], (err) => {
            if (err) {
              return res.status(500).json({ success: false, message: 'Database error' });
            }

            const token = generateToken(userId);
            res.status(201).json({
              success: true,
              token,
              user: { id: userId, name, email, role, avatarUrl, bio: '' }
            });
          });
        }
      );
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

exports.login = (req, res) => {
  try {
    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (!user || !comparePassword(password, user.password)) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // If 2FA is enabled, don't issue a token yet - send an OTP and require verification
      if (user.twoFactorEnabled) {
        const otp = generateOtp();
        const otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        db.run('UPDATE users SET otpCode = ?, otpExpires = ? WHERE id = ?', [otp, otpExpires, user.id], async (err) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
          }
          try {
            await sendMail({
              to: user.email,
              subject: 'Your Nexus verification code',
              text: `Your one-time verification code is ${otp}. It expires in 10 minutes.`
            });
          } catch (mailErr) {
            console.error('Failed to send OTP email:', mailErr);
          }
          res.json({ success: true, requiresOtp: true, userId: user.id, message: 'A verification code has been sent to your email' });
        });
        return;
      }

      db.run('UPDATE users SET isOnline = 1 WHERE id = ?', [user.id], (err) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Database error' });
        }

        const token = generateToken(user.id);

        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            isOnline: true
          }
        });
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// Step 2 of login when 2FA is enabled
exports.verifyLoginOtp = (req, res) => {
  try {
    const { userId, otp } = req.body;
    if (!userId || !otp) {
      return res.status(400).json({ success: false, message: 'userId and otp are required' });
    }

    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (!user || !user.otpCode) {
        return res.status(400).json({ success: false, message: 'No pending verification for this user' });
      }
      if (new Date(user.otpExpires) < new Date()) {
        return res.status(400).json({ success: false, message: 'Verification code has expired' });
      }
      if (user.otpCode !== String(otp)) {
        return res.status(400).json({ success: false, message: 'Invalid verification code' });
      }

      db.run('UPDATE users SET otpCode = NULL, otpExpires = NULL, isOnline = 1 WHERE id = ?', [user.id], (err) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        const token = generateToken(user.id);
        res.json({
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            isOnline: true
          }
        });
      });
    });
  } catch (error) {
    console.error('verifyLoginOtp error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Enable/disable 2FA for the logged-in user
exports.toggle2FA = (req, res) => {
  try {
    const { enabled } = req.body;
    db.run('UPDATE users SET twoFactorEnabled = ? WHERE id = ?', [enabled ? 1 : 0, req.user.id], (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      res.json({ success: true, twoFactorEnabled: !!enabled });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMe = (req, res) => {
  try {
    db.get('SELECT id, name, email, role, avatarUrl, bio, isOnline, isVerified, twoFactorEnabled, createdAt FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      db.get('SELECT * FROM profiles WHERE userId = ?', [req.user.id], (err, profile) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Database error' });
        }

        res.json({
          success: true,
          user,
          profile: profile || null
        });
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.logout = (req, res) => {
  try {
    db.run('UPDATE users SET isOnline = 0 WHERE id = ?', [req.user.id], (err) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      res.json({ success: true, message: 'Logged out successfully' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Request a password reset link
exports.forgotPassword = (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      // Always respond success to avoid leaking which emails are registered
      if (!user) {
        return res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expire = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

      db.run('UPDATE users SET resetPasswordToken = ?, resetPasswordExpire = ? WHERE id = ?', [hashedToken, expire, user.id], async (err) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Database error' });
        }

        const resetUrl = `${process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',')[0] : 'http://localhost:5173'}/reset-password?token=${rawToken}`;

        try {
          await sendMail({
            to: user.email,
            subject: 'Reset your Nexus password',
            text: `You requested a password reset. Click this link to reset your password (valid for 30 minutes): ${resetUrl}`
          });
        } catch (mailErr) {
          console.error('Failed to send reset email:', mailErr);
        }

        res.json({ success: true, message: 'If that email exists, a reset link has been sent' });
      });
    });
  } catch (error) {
    console.error('forgotPassword error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.resetPassword = (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    db.get(
      'SELECT * FROM users WHERE resetPasswordToken = ? AND resetPasswordExpire > ?',
      [hashedToken, new Date().toISOString()],
      (err, user) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (!user) {
          return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
        }

        const newHashed = hashPassword(password);
        db.run(
          'UPDATE users SET password = ?, resetPasswordToken = NULL, resetPasswordExpire = NULL WHERE id = ?',
          [newHashed, user.id],
          (err) => {
            if (err) {
              return res.status(500).json({ success: false, message: 'Database error' });
            }
            res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
          }
        );
      }
    );
  } catch (error) {
    console.error('resetPassword error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Change password while logged in (requires knowing the current password)
exports.changePassword = (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (!user || !comparePassword(currentPassword, user.password)) {
        return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      }

      const newHashed = hashPassword(newPassword);
      db.run('UPDATE users SET password = ? WHERE id = ?', [newHashed, user.id], (err) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, message: 'Password changed successfully' });
      });
    });
  } catch (error) {
    console.error('changePassword error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
