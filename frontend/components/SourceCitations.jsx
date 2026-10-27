"use client";
/**
 * SourceCitations component
 * Sources are hidden by default — user clicks "Show sources" to expand.
 */
import { useState } from "react";
import styles from "./SourceCitations.module.css";

const ExternalLinkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const ChevronIcon = ({ open }) => (
  <svg
    width="13" height="13" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export default function SourceCitations({ sources }) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className={styles.sourcesContainer}>
      {/* Toggle button — always visible */}
      <button
        className={styles.toggleBtn}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <GlobeIcon />
        <span>{open ? "Hide sources" : `Show sources (${sources.length})`}</span>
        <ChevronIcon open={open} />
      </button>

      {/* Sources list — shown only when open */}
      {open && (
        <div className={styles.sourcesList}>
          {sources.map((source, i) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sourceItem}
              title={source.url}
            >
              <div className={styles.sourceContent}>
                <span className={styles.sourceTitle}>{source.title || "LFU Website"}</span>
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
      )}
    </div>
  );
}
