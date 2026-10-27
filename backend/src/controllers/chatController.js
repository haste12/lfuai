const { getAIResponse } = require('../services/aiService');
const { checkAndIncrementLimit, getRemainingInfo } = require('../services/rateLimitService');

/**
 * POST /api/chat
 * Supports both authenticated users (userId = Firebase UID)
 * and guests (userId = 'guest' or 'guest:<sessionId>').
 * Returns { reply, sources, limitInfo }
 */
async function sendMessage(req, res, next) {
  try {
    const { message, userId, userName, history, sessionId } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // Accept guest sessions — use sessionId or fall back to 'guest'
    const effectiveUserId = userId || (sessionId ? `guest:${sessionId}` : 'guest');

    // Rate limit check (currently unlimited for all users)
    const { allowed, message: limitMessage } = await checkAndIncrementLimit(effectiveUserId);
    if (!allowed) {
      return res.status(429).json({ error: limitMessage });
    }

    // Get AI reply (now returns { reply, sources })
    const result = await getAIResponse(message.trim(), userName || null, history || []);

    // Handle both old string format and new { reply, sources } format
    if (typeof result === 'string') {
      return res.json({ reply: result, sources: [], limitInfo: limitMessage });
    }

    return res.json({
      reply: result.reply,
      sources: result.sources || [],
      limitInfo: limitMessage,
    });
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
