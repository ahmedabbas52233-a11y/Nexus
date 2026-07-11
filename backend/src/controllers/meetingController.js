const db = require('../database');

exports.createMeeting = (req, res) => {
  try {
    const { title, description, recipientId, startTime, endTime } = req.body;

    if (!title || !recipientId || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'title, recipientId, startTime and endTime are required' });
    }
    if (new Date(startTime) >= new Date(endTime)) {
      return res.status(400).json({ success: false, message: 'endTime must be after startTime' });
    }

    // Check for conflicts (either party already has an overlapping, non-rejected meeting)
    db.all(
      `SELECT * FROM meetings
       WHERE (requesterId = ? OR recipientId = ? OR requesterId = ? OR recipientId = ?)
       AND status != 'rejected'
       AND startTime < ? AND endTime > ?`,
      [req.user.id, req.user.id, recipientId, recipientId, endTime, startTime],
      (err, conflicts) => {
        if (err) {
          console.error('Meeting conflict check error:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        if (conflicts.length > 0) {
          return res.status(409).json({ success: false, message: 'Time slot conflicts with an existing meeting' });
        }

        db.run(
          'INSERT INTO meetings (title, description, requesterId, recipientId, startTime, endTime) VALUES (?, ?, ?, ?, ?, ?)',
          [title, description || '', req.user.id, recipientId, startTime, endTime],
          function (err) {
            if (err) {
              console.error('Create meeting error:', err);
              return res.status(500).json({ success: false, message: 'Database error' });
            }

            db.get('SELECT * FROM meetings WHERE id = ?', [this.lastID], (err, meeting) => {
              if (err) {
                return res.status(500).json({ success: false, message: 'Database error' });
              }
              res.status(201).json({ success: true, meeting });
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyMeetings = (req, res) => {
  try {
    db.all(
      `SELECT m.*,
        req.name as requesterName, req.email as requesterEmail,
        rec.name as recipientName, rec.email as recipientEmail
       FROM meetings m
       JOIN users req ON m.requesterId = req.id
       JOIN users rec ON m.recipientId = rec.id
       WHERE m.requesterId = ? OR m.recipientId = ?
       ORDER BY m.startTime DESC`,
      [req.user.id, req.user.id],
      (err, meetings) => {
        if (err) {
          console.error('getMyMeetings error:', err);
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, count: meetings.length, meetings });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateMeetingStatus = (req, res) => {
  try {
    const { status } = req.body;
    const meetingId = req.params.id;

    if (!['pending', 'accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    db.get('SELECT * FROM meetings WHERE id = ?', [meetingId], (err, meeting) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Database error' });
      }
      if (!meeting) {
        return res.status(404).json({ success: false, message: 'Meeting not found' });
      }
      if (meeting.recipientId !== req.user.id && meeting.requesterId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      db.run('UPDATE meetings SET status = ? WHERE id = ?', [status, meetingId], (err) => {
        if (err) {
          return res.status(500).json({ success: false, message: 'Database error' });
        }
        db.get('SELECT * FROM meetings WHERE id = ?', [meetingId], (err, updated) => {
          if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
          }
          res.json({ success: true, meeting: updated });
        });
      });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};