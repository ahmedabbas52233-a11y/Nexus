const db = require('../database');

// List conversations: the set of users the current user has exchanged messages with,
// merged with users of the opposite role so new conversations can be started.
exports.getConversations = (req, res) => {
  try {
    db.all(
      `SELECT
         CASE WHEN senderId = ? THEN recipientId ELSE senderId END as otherUserId,
         MAX(id) as lastMessageId
       FROM messages
       WHERE senderId = ? OR recipientId = ?
       GROUP BY otherUserId`,
      [req.user.id, req.user.id, req.user.id],
      (err, rows) => {
        if (err) {
          console.error('getConversations error:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (rows.length === 0) {
          return res.json({ success: true, conversations: [] });
        }

        const messageIds = rows.map(r => r.lastMessageId);
        const placeholders = messageIds.map(() => '?').join(',');

        db.all(
          `SELECT m.*, u.name as otherUserName, u.avatarUrl as otherUserAvatar, u.role as otherUserRole, u.isOnline as otherUserOnline
           FROM messages m
           JOIN users u ON u.id = CASE WHEN m.senderId = ? THEN m.recipientId ELSE m.senderId END
           WHERE m.id IN (${placeholders})
           ORDER BY m.createdAt DESC`,
          [req.user.id, ...messageIds],
          (err, conversations) => {
            if (err) {
              console.error('getConversations join error:', err);
              return res.status(500).json({ success: false, message: 'Database error' });
            }

            db.all(
              `SELECT senderId, COUNT(*) as unreadCount FROM messages
               WHERE recipientId = ? AND isRead = 0 GROUP BY senderId`,
              [req.user.id],
              (err, unreadRows) => {
                if (err) {
                  return res.status(500).json({ success: false, message: 'Database error' });
                }
                const unreadMap = {};
                unreadRows.forEach(r => { unreadMap[r.senderId] = r.unreadCount; });

                const result = conversations.map(c => {
                  const otherUserId = c.senderId === req.user.id ? c.recipientId : c.senderId;
                  return {
                    otherUserId,
                    otherUserName: c.otherUserName,
                    otherUserAvatar: c.otherUserAvatar,
                    otherUserRole: c.otherUserRole,
                    otherUserOnline: !!c.otherUserOnline,
                    lastMessage: c.content,
                    lastMessageAt: c.createdAt,
                    unreadCount: unreadMap[otherUserId] || 0
                  };
                });

                res.json({ success: true, conversations: result });
              }
            );
          }
        );
      }
    );
  } catch (error) {
    console.error('getConversations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMessages = (req, res) => {
  try {
    const otherUserId = parseInt(req.params.userId, 10);

    db.all(
      `SELECT * FROM messages
       WHERE (senderId = ? AND recipientId = ?) OR (senderId = ? AND recipientId = ?)
       ORDER BY createdAt ASC`,
      [req.user.id, otherUserId, otherUserId, req.user.id],
      (err, messages) => {
        if (err) {
          console.error('getMessages error:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }

        // Mark incoming messages as read
        db.run(
          'UPDATE messages SET isRead = 1 WHERE senderId = ? AND recipientId = ? AND isRead = 0',
          [otherUserId, req.user.id],
          () => {}
        );

        res.json({ success: true, count: messages.length, messages });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.sendMessage = (req, res) => {
  try {
    const recipientId = parseInt(req.params.userId, 10);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }
    if (recipientId === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot message yourself' });
    }

    db.get('SELECT id FROM users WHERE id = ?', [recipientId], (err, recipient) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (!recipient) {
        return res.status(404).json({ success: false, message: 'Recipient not found' });
      }

      db.run(
        'INSERT INTO messages (senderId, recipientId, content) VALUES (?, ?, ?)',
        [req.user.id, recipientId, content.trim()],
        function (err) {
          if (err) {
            console.error('sendMessage error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
          }
          db.get('SELECT * FROM messages WHERE id = ?', [this.lastID], (err, message) => {
            if (err) {
              return res.status(500).json({ success: false, message: 'Database error' });
            }

            // Push over websocket if the recipient is connected
            const io = req.app.get('io');
            if (io) {
              io.to(`user:${recipientId}`).emit('new_message', message);
            }

            res.status(201).json({ success: true, message });
          });
        }
      );
    });
  } catch (error) {
    console.error('sendMessage error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
