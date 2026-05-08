const express = require('express');
const router = express.Router();
const { upload: extractUpload, getHistory, getReport, health } = require('../controllers/extractController');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Health check — no auth required
router.get('/health', health);

// Protected routes
router.post('/upload', auth, upload.single('resume'), extractUpload);
router.get('/history', auth, getHistory);
router.get('/report/:id', auth, getReport);

module.exports = router;
