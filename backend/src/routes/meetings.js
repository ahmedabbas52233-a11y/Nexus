const express = require('express');
const router = express.Router();
const { createMeeting, getMyMeetings, updateMeetingStatus } = require('../controllers/meetingController');
const { protect } = require('../middleware/auth');

router.post('/', protect, createMeeting);
router.get('/', protect, getMyMeetings);
router.put('/:id/status', protect, updateMeetingStatus);

module.exports = router;