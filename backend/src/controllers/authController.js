const db = require('../database');
const jwt = require('jsonwebtoken');
const { hashPassword, comparePassword, generateAvatar } = require('../utils/helpers');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

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