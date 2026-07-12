const express = require('express');
const router = express.Router();
const { createMeeting, getMyMeetings, updateMeetingStatus } = require('../controllers/meetingController');
const { protect } = require('../middleware/auth');
const { meetingValidation, meetingStatusValidation } = require('../middleware/validation');

router.post('/', protect, meetingValidation, createMeeting);
router.get('/', protect, getMyMeetings);
router.put('/:id/status', protect, meetingStatusValidation, updateMeetingStatus);

module.exports = router;
