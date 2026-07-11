const jwt = require('jsonwebtoken');
const db = require('./database');

function initSocket(io) {
  // Authenticate every socket connection using the same JWT used for REST calls
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);

    db.run('UPDATE users SET isOnline = 1 WHERE id = ?', [userId], () => {});
    io.emit('presence', { userId, online: true });

    // ---- Chat ----
    socket.on('typing', ({ recipientId }) => {
      io.to(`user:${recipientId}`).emit('typing', { fromUserId: userId });
    });

    socket.on('stop_typing', ({ recipientId }) => {
      io.to(`user:${recipientId}`).emit('stop_typing', { fromUserId: userId });
    });

    // ---- WebRTC signaling for video/audio calls ----
    // callType: 'video' | 'audio'
    socket.on('call:invite', ({ toUserId, offer, callType }) => {
      io.to(`user:${toUserId}`).emit('call:invite', { fromUserId: userId, offer, callType });
    });

    socket.on('call:answer', ({ toUserId, answer }) => {
      io.to(`user:${toUserId}`).emit('call:answer', { fromUserId: userId, answer });
    });

    socket.on('call:ice-candidate', ({ toUserId, candidate }) => {
      io.to(`user:${toUserId}`).emit('call:ice-candidate', { fromUserId: userId, candidate });
    });

    socket.on('call:reject', ({ toUserId }) => {
      io.to(`user:${toUserId}`).emit('call:reject', { fromUserId: userId });
    });

    socket.on('call:end', ({ toUserId }) => {
      io.to(`user:${toUserId}`).emit('call:end', { fromUserId: userId });
    });

    socket.on('disconnect', () => {
      db.run('UPDATE users SET isOnline = 0 WHERE id = ?', [userId], () => {});
      io.emit('presence', { userId, online: false });
    });
  });
}

module.exports = initSocket;
