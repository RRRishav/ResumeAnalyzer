const express = require('express');
const router = express.Router();
const {
  analyze,
  exportFilteredToCsv,
  exportToCsv,
  getHistory,
  getReport,
  getStats,
  searchByRole,
  searchBySkill,
} = require('../controllers/resumeController');
const { auth } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/analyze', auth, upload.single('resume'), analyze);
router.get('/analyze', (req, res) => {
  res.status(405).json({
    error: 'Use the analyzer page to upload a resume.',
    message: 'This API endpoint only accepts POST requests with an authenticated PDF or DOCX upload.',
    analyzerUrl: 'http://localhost:5173/analyze',
  });
});
router.get('/history', auth, getHistory);
router.get('/stats', auth, getStats);
router.get('/export/csv', auth, exportToCsv);
router.get('/export/csv/filtered', auth, exportFilteredToCsv);
router.get('/search/role', auth, searchByRole);
router.get('/search/skill', auth, searchBySkill);
router.get('/report/:id', auth, getReport);

module.exports = router;
