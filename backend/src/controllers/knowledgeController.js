/**
 * knowledgeController.js
 * Handles admin knowledge management endpoints.
 * All mutation endpoints require a valid ADMIN_SECRET header.
 */

const { getKnowledgeStats, getAllSourcesMeta, deactivateSource } = require('../services/knowledgeService');
const { runSync, getSyncStatus, resyncUrl } = require('../services/syncService');
const { retrieveRelevantChunks } = require('../services/knowledgeService');

// ── Auth helper ───────────────────────────────────────────────────────────────
function isAdmin(req) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false; // Admin operations disabled if no secret set
  return req.headers['x-admin-secret'] === secret;
}

// ── GET /api/knowledge/stats ──────────────────────────────────────────────────
async function getStats(req, res, next) {
  try {
    const stats = await getKnowledgeStats();
    return res.json(stats);
  } catch (err) {
    next(err);
  }
}

// ── GET /api/knowledge/sources ────────────────────────────────────────────────
async function getSources(req, res, next) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
    }
    const sources = await getAllSourcesMeta();
    return res.json({ sources, count: sources.length });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/knowledge/sync ──────────────────────────────────────────────────
async function triggerSync(req, res, next) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
    }

    const { forceReindex = false } = req.body;
    const status = getSyncStatus();

    if (status.running) {
      return res.status(409).json({ error: 'Sync already in progress.', status });
    }

    // Start sync in background — return immediately
    res.json({ message: 'Sync started in background.', startedAt: new Date().toISOString() });

    // Run async (don't await)
    runSync({ triggeredBy: 'admin', forceReindex }).catch((err) => {
      console.error('[Admin] Background sync failed:', err.message);
    });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/knowledge/sync/status ───────────────────────────────────────────
async function syncStatus(req, res, next) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
    }
    return res.json(getSyncStatus());
  } catch (err) {
    next(err);
  }
}

// ── POST /api/knowledge/resync-url ────────────────────────────────────────────
async function resyncSingleUrl(req, res, next) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
    }

    const { url } = req.body;
    if (!url || !url.includes('lfu.edu.krd')) {
      return res.status(400).json({ error: 'Invalid URL. Must be an lfu.edu.krd URL.' });
    }

    const result = await resyncUrl(url);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

// ── POST /api/knowledge/deactivate ───────────────────────────────────────────
async function deactivate(req, res, next) {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
    }

    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required.' });
    }

    await deactivateSource(url);
    return res.json({ message: 'Source deactivated.', url });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/knowledge/search ─────────────────────────────────────────────────
// Public search endpoint (for testing / frontend use)
async function searchKnowledge(req, res, next) {
  try {
    const { q, limit = 5 } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required.' });
    }

    const chunks = await retrieveRelevantChunks(q, Math.min(parseInt(limit, 10), 10));
    const results = chunks.map(({ embedding: _e, ...rest }) => rest);
    return res.json({ query: q, results, count: results.length });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
  getSources,
  triggerSync,
  syncStatus,
  resyncSingleUrl,
  deactivate,
  searchKnowledge,
};
