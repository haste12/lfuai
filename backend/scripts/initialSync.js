#!/usr/bin/env node
/**
 * scripts/initialSync.js
 * Run this ONCE to perform the initial crawl and index of the LFU website.
 *
 * Usage:
 *   node scripts/initialSync.js
 *   node scripts/initialSync.js --force   (reindex everything even if unchanged)
 *
 * This will:
 *   1. Crawl lfu.edu.krd (up to 400 pages)
 *   2. Extract text from each page
 *   3. Generate embeddings via OpenAI
 *   4. Store chunks in Firestore
 *
 * Estimated time: 15-40 minutes depending on network speed and page count.
 * Estimated OpenAI cost: ~$0.01-0.05 for text-embedding-3-small
 */

require('dotenv').config();
const { runSync } = require('../src/services/syncService');

const forceReindex = process.argv.includes('--force');

console.log('╔════════════════════════════════════════════╗');
console.log('║     LFU AI — Initial Knowledge Base Sync    ║');
console.log('╚════════════════════════════════════════════╝');
console.log('');
console.log('This will crawl https://lfu.edu.krd and index the content.');
console.log('Force reindex:', forceReindex);
console.log('');

(async () => {
  try {
    const result = await runSync({ triggeredBy: 'manual', forceReindex });
    console.log('\n✅ Sync completed:');
    console.log(`   Pages processed : ${result.pagesProcessed}`);
    console.log(`   Chunks indexed  : ${result.chunksAdded}`);
    console.log(`   Errors          : ${result.errorCount || 0}`);
    if (result.errors && result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.slice(0, 10).forEach((e) => {
        console.log(`   - ${e.url}: ${e.error}`);
      });
    }
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Sync failed:', err.message);
    process.exit(1);
  }
})();
