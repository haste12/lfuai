/**
 * knowledgeService.js
 * Manages the LFU knowledge base stored in Firestore.
 *
 * Collections:
 *   lfu_knowledge_chunks  — chunked page text with embeddings
 *   lfu_knowledge_meta    — per-source metadata (URL, hash, last crawled)
 *   lfu_sync_log          — synchronization run history
 *
 * Strategy: store embedding vectors as plain arrays in Firestore documents.
 * At query time, load all chunks into memory and compute cosine similarity
 * in Node.js. Practical for a university knowledge base (~200–500 pages).
 *
 * For a production deployment at much larger scale, migrate to a dedicated
 * vector store (e.g. Pinecone, Weaviate) while keeping Firestore for auth
 * and conversation history.
 */

const crypto = require('crypto');
const { db } = require('../config/firebase');
const { generateEmbedding, generateEmbeddingsBatch, hybridSearch } = require('./embeddingService');

// Firestore collection names
const CHUNKS_COL = 'lfu_knowledge_chunks';
const META_COL = 'lfu_knowledge_meta';
const SYNC_LOG_COL = 'lfu_sync_log';

// Chunking parameters
const CHUNK_SIZE = 800;       // characters
const CHUNK_OVERLAP = 150;    // characters overlap between consecutive chunks

// ── In-memory chunk cache ──────────────────────────────────────────────────────
// Loaded once per sync cycle; refreshed on demand.
let _chunkCache = null;
let _cacheLoadedAt = null;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

async function getChunksFromCache() {
  const now = Date.now();
  if (_chunkCache && _cacheLoadedAt && (now - _cacheLoadedAt) < CACHE_TTL_MS) {
    return _chunkCache;
  }
  return null;
}

function invalidateCache() {
  _chunkCache = null;
  _cacheLoadedAt = null;
}

// ── Text chunking ──────────────────────────────────────────────────────────────
/**
 * Split long text into overlapping chunks at sentence/paragraph boundaries.
 */
function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const chunks = [];
  if (!text || text.length === 0) return chunks;

  // Split on paragraph breaks first
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 30);

  let currentChunk = '';

  for (const para of paragraphs) {
    // If adding this paragraph would exceed chunk size, save current and start new
    if (currentChunk.length + para.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      // Keep last `overlap` chars for context continuity
      currentChunk = currentChunk.slice(-overlap) + '\n\n' + para;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para;
    }
  }

  if (currentChunk.trim().length > 50) {
    chunks.push(currentChunk.trim());
  }

  // If text had no paragraph breaks, fall back to sliding window
  if (chunks.length === 0 && text.length > 0) {
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.slice(i, i + chunkSize).trim();
      if (chunk.length > 50) chunks.push(chunk);
    }
  }

  return chunks;
}

// ── Index a single page ────────────────────────────────────────────────────────
/**
 * Index a crawled page (or PDF) into Firestore.
 * Generates embeddings and stores chunks with metadata.
 *
 * @param {object} pageData - { url, title, text, crawledAt, contentHash, pdfLinks? }
 * @param {boolean} forceReindex - reindex even if content hash unchanged
 * @returns {number} number of chunks written
 */
async function indexPage(pageData, forceReindex = false) {
  const { url, title, text, crawledAt, contentHash } = pageData;

  if (!text || text.length < 100) {
    console.log(`[Knowledge] Skipping thin content: ${url}`);
    return 0;
  }

  // Check if already indexed with same hash
  if (!forceReindex) {
    const metaRef = db.collection(META_COL).doc(urlToId(url));
    const metaSnap = await metaRef.get();
    if (metaSnap.exists && metaSnap.data().contentHash === contentHash) {
      console.log(`[Knowledge] No change detected, skipping: ${url}`);
      // Update lastChecked timestamp
      await metaRef.update({ lastChecked: new Date().toISOString() });
      return 0;
    }
  }

  // Delete old chunks for this URL
  await deleteChunksForUrl(url);

  // Split into chunks
  const rawChunks = chunkText(text);
  if (rawChunks.length === 0) return 0;

  console.log(`[Knowledge] Embedding ${rawChunks.length} chunks for: ${url}`);

  // Generate embeddings in batch
  const embeddings = await generateEmbeddingsBatch(rawChunks);

  // Write chunks to Firestore
  const batch = db.batch();
  const chunkIds = [];

  for (let i = 0; i < rawChunks.length; i++) {
    const chunkId = `${urlToId(url)}_c${i}`;
    chunkIds.push(chunkId);
    const ref = db.collection(CHUNKS_COL).doc(chunkId);
    batch.set(ref, {
      chunkId,
      sourceUrl: url,
      title: title || url,
      text: rawChunks[i],
      chunkIndex: i,
      totalChunks: rawChunks.length,
      embedding: embeddings[i],
      crawledAt,
      indexedAt: new Date().toISOString(),
    });
  }

  await batch.commit();

  // Write/update source metadata
  await db.collection(META_COL).doc(urlToId(url)).set({
    url,
    title: title || url,
    contentHash,
    chunkCount: rawChunks.length,
    chunkIds,
    crawledAt,
    lastChecked: new Date().toISOString(),
    indexedAt: new Date().toISOString(),
    active: true,
  });

  invalidateCache();
  console.log(`[Knowledge] Indexed ${rawChunks.length} chunks for: ${url}`);
  return rawChunks.length;
}

// ── Delete chunks for a URL ────────────────────────────────────────────────────
async function deleteChunksForUrl(url) {
  const snapshot = await db.collection(CHUNKS_COL)
    .where('sourceUrl', '==', url)
    .get();

  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

// ── Deactivate a source ────────────────────────────────────────────────────────
async function deactivateSource(url) {
  const id = urlToId(url);
  await db.collection(META_COL).doc(id).update({ active: false });
  await deleteChunksForUrl(url);
  invalidateCache();
}

// ── Load all chunks (with cache) ───────────────────────────────────────────────
async function loadAllChunks() {
  const cached = await getChunksFromCache();
  if (cached) return cached;

  console.log('[Knowledge] Loading all chunks from Firestore...');

  // Fetch without embeddings first (for keyword search & metadata)
  // Embeddings are large (1536 floats) — only load when needed for semantic search
  const snapshot = await db.collection(CHUNKS_COL)
    .select('chunkId', 'sourceUrl', 'title', 'text', 'chunkIndex', 'crawledAt', 'indexedAt')
    .get();

  const chunks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  _chunkCache = chunks;
  _cacheLoadedAt = Date.now();
  console.log(`[Knowledge] Loaded ${chunks.length} chunks into cache (no embeddings).`);
  return chunks;
}

// ── Retrieve relevant chunks for a query ──────────────────────────────────────
/**
 * Main retrieval function. Returns top-K chunks relevant to the query.
 * Uses hybrid search (semantic + keyword).
 *
 * @param {string} query
 * @param {number} topK
 * @returns {Array<{chunkId, sourceUrl, title, text, score}>}
 */
async function retrieveRelevantChunks(query, topK = 6) {
  const chunks = await loadAllChunks();
  if (chunks.length === 0) return [];

  const results = await hybridSearch(query, chunks, topK);
  return results.map(({ embedding: _emb, ...rest }) => rest); // strip embedding from response
}

// ── Get all source metadata ────────────────────────────────────────────────────
async function getAllSourcesMeta() {
  const snapshot = await db.collection(META_COL).where('active', '==', true).get();
  return snapshot.docs.map((doc) => doc.data());
}

// ── Get sync status ────────────────────────────────────────────────────────────
async function getKnowledgeStats() {
  const [chunksSnap, metaSnap, logSnap] = await Promise.all([
    db.collection(CHUNKS_COL).count().get(),
    db.collection(META_COL).where('active', '==', true).count().get(),
    db.collection(SYNC_LOG_COL).orderBy('startedAt', 'desc').limit(5).get(),
  ]);

  return {
    totalChunks: chunksSnap.data().count,
    totalSources: metaSnap.data().count,
    recentSyncs: logSnap.docs.map((d) => d.data()),
  };
}

// ── Log sync run ───────────────────────────────────────────────────────────────
async function logSync(status, details = {}) {
  await db.collection(SYNC_LOG_COL).add({
    status,
    startedAt: details.startedAt || new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    pagesProcessed: details.pagesProcessed || 0,
    chunksAdded: details.chunksAdded || 0,
    errors: details.errors || [],
    triggeredBy: details.triggeredBy || 'scheduled',
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function urlToId(url) {
  return crypto.createHash('md5').update(url).digest('hex');
}

module.exports = {
  indexPage,
  retrieveRelevantChunks,
  getAllSourcesMeta,
  getKnowledgeStats,
  logSync,
  deactivateSource,
  deleteChunksForUrl,
  invalidateCache,
  chunkText,
  CHUNKS_COL,
  META_COL,
  SYNC_LOG_COL,
};
