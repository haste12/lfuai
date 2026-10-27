/**
 * syncService.js
 * Orchestrates the full crawl → index pipeline.
 * Runs on a schedule (default: every 24 hours) and can be triggered manually.
 * All heavy imports (crawler, PDF, cron) are lazy — safe for Vercel serverless.
 */
const { indexPage, getAllSourcesMeta, logSync } = require('./knowledgeService');

let _syncRunning = false;
let _syncJob = null;
let _lastSyncResult = null;

// Default schedule: 2:00 AM every day
const DEFAULT_CRON = process.env.SYNC_CRON || '0 2 * * *';

/**
 * Run a full synchronization: crawl the LFU website and index all content.
 * @param {object} options
 * @param {string} options.triggeredBy - 'scheduled' | 'admin' | 'manual'
 * @param {boolean} options.forceReindex - force reindex even if content unchanged
 */
async function runSync({ triggeredBy = 'scheduled', forceReindex = false } = {}) {
  if (_syncRunning) {
    console.log('[Sync] Already running — skipping.');
    return { status: 'skipped', reason: 'already_running' };
  }

  // Lazy-load heavy modules only when sync actually runs
  const { crawlLFU } = require('./crawlerService');
  const { processPdfUrl } = require('./pdfService');

  _syncRunning = true;
  const startedAt = new Date().toISOString();
  const errors = [];
  let pagesProcessed = 0;
  let chunksAdded = 0;

  console.log(`[Sync] Starting synchronization (triggered by: ${triggeredBy})`);

  try {
    // Get existing indexed URLs to detect changes
    const existingMeta = await getAllSourcesMeta();
    const existingHashMap = new Map(existingMeta.map((m) => [m.url, m.contentHash]));
    const alreadyIndexed = new Set(existingMeta.map((m) => m.url));

    // ── Phase 1: Crawl website ─────────────────────────────────────────────
    const pages = await crawlLFU(
      forceReindex ? new Set() : alreadyIndexed,
      async (page) => {
        // Process each page as it's crawled (streaming pipeline)
        try {
          const prevHash = existingHashMap.get(page.url);
          const changed = forceReindex || prevHash !== page.contentHash;

          if (changed) {
            const n = await indexPage(page, forceReindex);
            chunksAdded += n;
          }
          pagesProcessed++;

          // ── Phase 2: Process PDF links discovered on this page ─────────
          if (page.pdfLinks && page.pdfLinks.length > 0) {
            for (const pdfUrl of page.pdfLinks.slice(0, 5)) { // max 5 PDFs per page
              try {
                const pdfData = await processPdfUrl(pdfUrl);
                if (pdfData.text && pdfData.text.length > 100) {
                  const n2 = await indexPage(pdfData, forceReindex);
                  chunksAdded += n2;
                }
              } catch (pdfErr) {
                console.warn(`[Sync] PDF error for ${pdfUrl}: ${pdfErr.message}`);
                errors.push({ url: pdfUrl, error: pdfErr.message });
              }
            }
          }
        } catch (pageErr) {
          console.warn(`[Sync] Error indexing ${page.url}: ${pageErr.message}`);
          errors.push({ url: page.url, error: pageErr.message });
        }
      }
    );

    const result = {
      status: 'completed',
      startedAt,
      finishedAt: new Date().toISOString(),
      pagesProcessed,
      chunksAdded,
      totalPagesFound: pages.length,
      errorCount: errors.length,
      errors: errors.slice(0, 20), // keep last 20 errors in log
      triggeredBy,
    };

    _lastSyncResult = result;
    await logSync('completed', result);
    console.log(`[Sync] Completed. Pages: ${pagesProcessed}, Chunks: ${chunksAdded}, Errors: ${errors.length}`);
    return result;

  } catch (err) {
    console.error('[Sync] Sync failed:', err.message);
    const result = {
      status: 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      error: err.message,
      pagesProcessed,
      chunksAdded,
      errors,
      triggeredBy,
    };
    _lastSyncResult = result;
    await logSync('failed', result);
    return result;
  } finally {
    _syncRunning = false;
  }
}

/**
 * Re-check a specific URL for changes and re-index if changed.
 */
async function resyncUrl(url) {
  try {
    const { fetchPage } = require('./crawlerService');
    const page = await fetchPage(url);
    const n = await indexPage(page, true);
    return { url, chunksAdded: n, status: 'ok' };
  } catch (err) {
    return { url, status: 'error', error: err.message };
  }
}

/**
 * Start the scheduled synchronization job.
 * node-cron is loaded lazily here — safe for Vercel serverless.
 */
function startScheduler() {
  if (_syncJob) {
    console.log('[Sync] Scheduler already running.');
    return;
  }

  // Lazy require — node-cron only loads when scheduler is explicitly started
  const cron = require('node-cron');
  const schedule = DEFAULT_CRON;
  console.log(`[Sync] Starting scheduler with cron: "${schedule}"`);

  _syncJob = cron.schedule(schedule, async () => {
    console.log('[Sync] Scheduled sync triggered.');
    await runSync({ triggeredBy: 'scheduled' });
  }, {
    timezone: 'Asia/Erbil',
  });

  console.log('[Sync] Scheduler started. Next sync at 2:00 AM (Erbil time).');
}

/**
 * Stop the scheduler.
 */
function stopScheduler() {
  if (_syncJob) {
    _syncJob.destroy();
    _syncJob = null;
    console.log('[Sync] Scheduler stopped.');
  }
}

/**
 * Get current sync status.
 */
function getSyncStatus() {
  return {
    running: _syncRunning,
    schedulerActive: _syncJob !== null,
    lastResult: _lastSyncResult,
  };
}

module.exports = { runSync, resyncUrl, startScheduler, stopScheduler, getSyncStatus };
