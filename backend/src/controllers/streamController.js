/**
 * streamController.js
 * Server-Sent Events (SSE) streaming endpoint for AI chat responses.
 * Streams Gemini response tokens to the client as they arrive.
 */

const { streamAIResponse } = require('../services/aiService');
const { checkAndIncrementLimit } = require('../services/rateLimitService');

/**
 * POST /api/chat/stream
 *
 * SSE protocol:
 *   data: {"type":"chunk","text":"..."}  — text token
 *   data: {"type":"sources","sources":[...]}  — sources (sent once, at end)
 *   data: {"type":"done","cached":bool}  — stream complete
 *   data: {"type":"error","message":"..."}  — on error
 */
async function streamMessage(req, res, next) {
  const { message, userId, userName, history, sessionId } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  const effectiveUserId = userId || (sessionId ? `guest:${sessionId}` : 'guest');

  // Rate limit check
  const { allowed, message: limitMessage } = await checkAndIncrementLimit(effectiveUserId);
  if (!allowed) {
    return res.status(429).json({ error: limitMessage });
  }

  // ── Set SSE headers ───────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders(); // Send headers immediately

  // Helper: write a typed SSE event
  const send = (payload) => {
    if (res.writableEnded) return;
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  // Handle client disconnect
  let aborted = false;
  req.on('close', () => { aborted = true; });

  try {
    const generator = streamAIResponse(
      message.trim(),
      userName || null,
      history || []
    );

    for await (const chunk of generator) {
      if (aborted) break;

      if (typeof chunk === 'string') {
        // Text token
        send({ type: 'chunk', text: chunk });
      } else if (chunk && typeof chunk === 'object') {
        // Final metadata: sources + done signal
        if (chunk.sources !== undefined) {
          send({ type: 'sources', sources: chunk.sources || [] });
        }
        send({ type: 'done', cached: chunk.cached || false });
      }
    }
  } catch (err) {
    console.error('[Stream] Error:', err.message);
    if (!res.writableEnded) {
      send({ type: 'error', message: 'The AI model encountered an error. Please try again.' });
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
}

module.exports = { streamMessage };
