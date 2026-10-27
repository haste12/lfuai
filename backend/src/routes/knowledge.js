const express = require('express');
const router = express.Router();
const {
  getStats,
  getSources,
  triggerSync,
  syncStatus,
  resyncSingleUrl,
  deactivate,
  searchKnowledge,
} = require('../controllers/knowledgeController');

// Public
router.get('/stats', getStats);
router.get('/search', searchKnowledge);

// Admin-protected (require X-Admin-Secret header)
router.get('/sources', getSources);
router.post('/sync', triggerSync);
router.get('/sync/status', syncStatus);
router.post('/resync-url', resyncSingleUrl);
router.post('/deactivate', deactivate);

module.exports = router;
