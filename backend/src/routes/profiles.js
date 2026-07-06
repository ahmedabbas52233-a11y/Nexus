const express = require('express');
const router = express.Router();
const { getMyProfile, updateProfile, getAllProfiles, getProfileById } = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateProfile);
router.get('/', protect, getAllProfiles);
router.get('/:userId', protect, getProfileById);

module.exports = router;