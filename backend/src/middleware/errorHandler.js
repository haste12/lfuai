function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, _next) {
  console.error('❌ Error:', err.message);
  // Send the actual error message to the client instead of masking it.
  // This helps debug rate limits from Gemini (e.g. 429 Resource exhausted).
  const status = err.status || (err.message.includes('429') ? 429 : 500);
  res.status(status).json({
    error: err.message,
  });
}

module.exports = { notFound, errorHandler };
