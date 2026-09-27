const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const emotionController = require('../controllers/emotionController');

// Get emotions for a patient
router.get('/patient/:patientId', auth, emotionController.getPatientEmotions);

// Record new emotion
router.post('/record', auth, emotionController.recordEmotion);

// Get emotion statistics
router.get('/stats/:patientId', auth, emotionController.getEmotionStats);

// Get emotion trends
router.get('/trends/:patientId', auth, emotionController.getEmotionTrends);

module.exports = router;
