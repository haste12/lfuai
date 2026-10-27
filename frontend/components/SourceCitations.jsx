/**
 * SourceCitations component
 * Displays clickable source links below an AI answer when the response
 * was grounded by the university knowledge base.
 */
import styles from './SourceCitations.module.css';

const ExternalLinkIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export default function SourceCitations({ sources }) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className={styles.sourcesContainer}>
      <div className={styles.sourcesHeader}>
        <GlobeIcon />
        <span>Sources from lfu.edu.krd</span>
      </div>
      <div className={styles.sourcesList}>
        {sources.map((source, i) => (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceItem}
            title={source.excerpt || source.title}
          >
            <div className={styles.sourceContent}>
              <span className={styles.sourceTitle}>{source.title || 'LFU Website'}</span>
              {source.excerpt && (
                <span className={styles.sourceExcerpt}>{source.excerpt}</span>
              )}
            </div>
            <span className={styles.sourceLink}>
              <ExternalLinkIcon />
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
