const express = require('express');
const router = express.Router();
const { sendMessage, getRemainingMessages } = require('../controllers/chatController');
const { streamMessage } = require('../controllers/streamController');

// POST /api/chat — standard (non-streaming) fallback
router.post('/', sendMessage);

// POST /api/chat/stream — SSE streaming endpoint
router.post('/stream', streamMessage);

// GET /api/chat/remaining/:userId
router.get('/remaining/:userId', getRemainingMessages);

module.exports = router;
