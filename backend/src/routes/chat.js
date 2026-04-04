const express = require('express');
const router = express.Router();
const { sendMessage, getRemainingMessages } = require('../controllers/chatController');

// POST /api/chat
router.post('/', sendMessage);

// GET /api/chat/remaining/:userId
router.get('/remaining/:userId', getRemainingMessages);

module.exports = router;
