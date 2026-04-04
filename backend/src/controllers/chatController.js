const { getAIResponse } = require('../services/aiService');
const { checkAndIncrementLimit, getRemainingInfo } = require('../services/rateLimitService');

/**
 * POST /api/chat
 */
async function sendMessage(req, res, next) {
  try {
    const { message, userId, userName, history } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required.' });
    }

    // Rate limit check
    const { allowed, message: limitMessage } = await checkAndIncrementLimit(userId);
    if (!allowed) {
      return res.status(429).json({ error: limitMessage });
    }

    // Get AI reply
    const reply = await getAIResponse(message.trim(), userName, history);

    return res.json({ reply, limitInfo: limitMessage });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/chat/remaining/:userId
 */
async function getRemainingMessages(req, res, next) {
  try {
    const { userId } = req.params;
    const info = await getRemainingInfo(userId);

    if (!info) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json(info);
  } catch (err) {
    next(err);
  }
}

module.exports = { sendMessage, getRemainingMessages };
