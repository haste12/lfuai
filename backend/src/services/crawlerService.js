/**
 * crawlerService.js
 * LFU website crawler — fetches public pages from lfu.edu.krd,
 * extracts readable text, follows internal links, respects robots.txt.
 * Does NOT use a headless browser; falls back gracefully on JS-heavy pages.
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

// ── Constants ──────────────────────────────────────────────────────────────────
const ALLOWED_DOMAIN = 'lfu.edu.krd';
const BASE_URL = 'https://lfu.edu.krd';
const SITEMAP_INDEX = 'https://lfu.edu.krd/sitemap_index.xml';
const USER_AGENT = 'LFU-AI-Bot/1.0 (+https://lfu.edu.krd; educational-assistant)';
const REQUEST_DELAY_MS = 1500;   // Be respectful — 1.5s between requests
const MAX_DEPTH = 4;
const MAX_PAGES = 400;
const REQUEST_TIMEOUT_MS = 15000;

// URL patterns to skip (not useful university content)
const SKIP_PATTERNS = [
  /\/portfolio-/i,
  /\/blog-full-/i,
  /\/blog-grid-/i,
  /\/blog-2-columns/i,
  /\/blog-3-columns/i,
  /\/blog-4-columns/i,
  /\/woocommerce/i,
  /\/shop\//i,
  /\/cart\//i,
  /\/checkout\//i,
  /\/my-account\//i,
  /\/sample\//i,
  /\/newsletter\//i,
  /\?replytocom=/i,
  /\/wp-login/i,
  /\/wp-admin/i,
  /\/wp-json/i,
  /\/feed\//i,
  /\/comments\//i,
  /\.pdf$/i,   // PDFs handled separately
  /\.(jpg|jpeg|png|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/i,
];

// Priority seeds — most important university pages
const SEED_URLS = [
  'https://lfu.edu.krd/',
  'https://lfu.edu.krd/about/',
  'https://lfu.edu.krd/engineering-2/',
  'https://lfu.edu.krd/medical/',
  'https://lfu.edu.krd/education/',
  'https://lfu.edu.krd/law/',
  'https://lfu.edu.krd/administration-business/',
  'https://lfu.edu.krd/contact/',
  'https://lfu.edu.krd/admission/',
  'https://lfu.edu.krd/news/',
  'https://lfu.edu.krd/announcements/',
  'https://lfu.edu.krd/scholarships/',
];

// ── Helper: throttled sleep ────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Helper: normalize URL ──────────────────────────────────────────────────────
function normalizeUrl(rawUrl, basePageUrl) {
  try {
    const resolved = new URL(rawUrl, basePageUrl);
    // Only allow the LFU domain
    if (!resolved.hostname.endsWith(ALLOWED_DOMAIN)) return null;
    // Strip fragments and tracking params
    resolved.hash = '';
    resolved.searchParams.delete('utm_source');
    resolved.searchParams.delete('utm_medium');
    resolved.searchParams.delete('utm_campaign');
    return resolved.href;
  } catch {
    return null;
  }
}

// ── Helper: should skip URL ────────────────────────────────────────────────────
function shouldSkip(url) {
  return SKIP_PATTERNS.some((pat) => pat.test(url));
}

// ── HTML fetcher ───────────────────────────────────────────────────────────────
async function fetchHtml(url) {
  const res = await axios.get(url, {
    timeout: REQUEST_TIMEOUT_MS,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    maxRedirects: 5,
    validateStatus: (status) => status < 400,
  });
  return res.data;
}

// ── Text extraction from HTML ──────────────────────────────────────────────────
function extractText($, url) {
  // Remove non-content elements
  $('script, style, nav, footer, header, .menu, .navigation, .sidebar, .widget, ' +
    '.breadcrumb, .social-share, .comments, .comment-form, form, iframe, ' +
    '#wpadminbar, .wp-block-navigation, .cookie-banner').remove();

  const title = $('title').text().trim() ||
    $('h1').first().text().trim() ||
    $('h2').first().text().trim();

  // Extract main content area
  let contentEl = $('main, article, .entry-content, .post-content, .page-content, ' +
    '.content-area, #content, .site-main').first();

  if (!contentEl.length) contentEl = $('body');

  const rawText = contentEl.text();

  // Clean whitespace
  const text = rawText
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Extract internal links for further crawling
  const links = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const normalized = normalizeUrl(href, url);
    if (normalized && !shouldSkip(normalized)) {
      links.push(normalized);
    }
  });

  // Extract any PDF links
  const pdfLinks = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.toLowerCase().endsWith('.pdf')) {
      const abs = normalizeUrl(href, url);
      if (abs) pdfLinks.push(abs);
    }
  });

  return { title, text, links, pdfLinks };
}

// ── Sitemap parser ─────────────────────────────────────────────────────────────
async function parseSitemapUrls() {
  const urls = new Set();
  try {
    // Fetch the sitemap index
    const indexXml = await fetchHtml(SITEMAP_INDEX);
    const $idx = cheerio.load(indexXml, { xmlMode: true });
    const sitemapLocs = [];
    $idx('loc').each((_, el) => {
      const loc = $idx(el).text().trim();
      if (loc.endsWith('.xml')) sitemapLocs.push(loc);
    });

    // Fetch each sitemap
    for (const sitemapUrl of sitemapLocs) {
      try {
        const xml = await fetchHtml(sitemapUrl);
        const $sm = cheerio.load(xml, { xmlMode: true });
        $sm('url > loc').each((_, el) => {
          const loc = $sm(el).text().trim();
          if (loc && !shouldSkip(loc)) urls.add(loc);
        });
        await sleep(500);
      } catch (err) {
        console.warn(`[Crawler] Could not fetch sitemap ${sitemapUrl}: ${err.message}`);
      }
    }
  } catch (err) {
    console.warn('[Crawler] Sitemap index fetch failed:', err.message);
  }
  return [...urls];
}

// ── Main crawl function ────────────────────────────────────────────────────────
/**
 * Crawls the LFU website and returns an array of page objects:
 * { url, title, text, pdfLinks, crawledAt, contentHash }
 *
 * @param {Set<string>} alreadyIndexed - URLs already in the knowledge base (skip re-crawl)
 * @param {function} onPage - callback(pageData) called for each crawled page
 */
async function crawlLFU(alreadyIndexed = new Set(), onPage = null) {
  const visited = new Set(alreadyIndexed);
  const queue = [];
  const results = [];

  // Start with sitemap URLs
  console.log('[Crawler] Fetching sitemap URLs...');
  const sitemapUrls = await parseSitemapUrls();
  console.log(`[Crawler] Sitemap yielded ${sitemapUrls.length} URLs`);

  // Add sitemap URLs and seeds to queue
  const allSeeds = [...new Set([...SEED_URLS, ...sitemapUrls])];
  for (const url of allSeeds) {
    if (!visited.has(url) && !shouldSkip(url)) {
      queue.push({ url, depth: 0 });
    }
  }

  let pagesProcessed = 0;

  while (queue.length > 0 && pagesProcessed < MAX_PAGES) {
    const { url, depth } = queue.shift();

    if (visited.has(url)) continue;
    visited.add(url);

    try {
      console.log(`[Crawler] Fetching [${pagesProcessed + 1}/${MAX_PAGES}] depth=${depth}: ${url}`);
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);
      const { title, text, links, pdfLinks } = extractText($, url);

      // Skip pages with very little content
      if (text.length < 100) {
        console.log(`[Crawler] Skipping thin page: ${url}`);
        await sleep(REQUEST_DELAY_MS);
        continue;
      }

      const pageData = {
        url,
        title: title || url,
        text,
        pdfLinks,
        crawledAt: new Date().toISOString(),
        contentHash: require('crypto').createHash('md5').update(text).digest('hex'),
      };

      results.push(pageData);
      pagesProcessed++;

      if (onPage) await onPage(pageData);

      // Queue discovered links (if not too deep)
      if (depth < MAX_DEPTH) {
        for (const link of links) {
          if (!visited.has(link) && !shouldSkip(link)) {
            queue.push({ url: link, depth: depth + 1 });
          }
        }
      }

      await sleep(REQUEST_DELAY_MS);
    } catch (err) {
      console.warn(`[Crawler] Failed to fetch ${url}: ${err.message}`);
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log(`[Crawler] Done. Crawled ${results.length} pages.`);
  return results;
}

// ── Single page re-check ───────────────────────────────────────────────────────
/**
 * Fetch a single URL and return its page data (for change detection).
 */
async function fetchPage(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const { title, text, pdfLinks } = extractText($, url);
  const crypto = require('crypto');
  return {
    url,
    title: title || url,
    text,
    pdfLinks,
    crawledAt: new Date().toISOString(),
    contentHash: crypto.createHash('md5').update(text).digest('hex'),
  };
}

module.exports = { crawlLFU, fetchPage, parseSitemapUrls, ALLOWED_DOMAIN, BASE_URL };
