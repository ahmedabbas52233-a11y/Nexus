const db = require('../database');

exports.createMeeting = (req, res) => {
  try {
    const { title, description, recipientId, startTime, endTime } = req.body;

    // Check for conflicts
    const conflicts = db.prepare(`
      SELECT * FROM meetings 
      WHERE ((requesterId = ? OR recipientId = ?) OR (requesterId = ? OR recipientId = ?))
      AND status != 'rejected'
      AND ((startTime <= ? AND endTime >= ?) OR (startTime <= ? AND endTime >= ?))
    `).all(req.user.id, req.user.id, recipientId, recipientId, endTime, startTime, startTime, endTime);

    if (conflicts.length > 0) {
      return res.status(409).json({ success: false, message: 'Time slot conflicts with existing meeting' });
    }

    const result = db.prepare(
      'INSERT INTO meetings (title, description, requesterId, recipientId, startTime, endTime) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(title, description || '', req.user.id, recipientId, startTime, endTime);

    const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, meeting });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyMeetings = (req, res) => {
  try {
    const meetings = db.prepare(`
      SELECT m.*, 
        req.name as requesterName, req.email as requesterEmail,
        rec.name as recipientName, rec.email as recipientEmail
      FROM meetings m
      JOIN users req ON m.requesterId = req.id
      JOIN users rec ON m.recipientId = rec.id
      WHERE m.requesterId = ? OR m.recipientId = ?
      ORDER BY m.startTime DESC
    `).all(req.user.id, req.user.id);

    res.json({ success: true, count: meetings.length, meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateMeetingStatus = (req, res) => {
  try {
    const { status } = req.body;
    const meetingId = req.params.id;

    const meeting = db.prepare('SELECT * FROM meetings WHERE id = ?').get(meetingId);
    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (meeting.recipientId !== req.user.id && meeting.requesterId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    db.prepare('UPDATE meetings SET status = ? WHERE id = ?').run(status, meetingId);
    const updated = db.prepare('SELECT * FROM meetings WHERE id = ?').get(meetingId);

    res.json({ success: true, meeting: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};