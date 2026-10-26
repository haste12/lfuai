"use client";
import { useState } from "react";
import { useLang, TRANSLATIONS } from "../context/LanguageContext";
import styles from "./IntroModal.module.css";

/* LFU Logo SVG */
function LFULogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="introLogoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6c63ff"/>
          <stop offset="1" stopColor="#00b4d8"/>
        </linearGradient>
      </defs>
      <path d="M50 5C25.1 5 5 23.4 5 46c0 11.8 5.2 22.5 13.6 30L14 92l18.5-8.4C37.1 85 43.4 86 50 86c24.9 0 45-18.4 45-40S74.9 5 50 5z" fill="url(#introLogoGrad)"/>
      <circle cx="50" cy="46" r="22" fill="white" opacity="0.9"/>
      <path d="M50 28c0 0-3 9-9 12 6 3 9 12 9 12s3-9 9-12c-6-3-9-12-9-12z" fill="url(#introLogoGrad)"/>
    </svg>
  );
}

const LANG_LIST = [
  { code: "en", native: "English", label: "English" },
  { code: "ar", native: "العربية", label: "Arabic" },
  { code: "ku", native: "کوردی", label: "Kurdish" },
];

export default function IntroModal({ onComplete }) {
  const { setLang } = useLang();
  const [step, setStep] = useState(1);
  const [selectedLang, setSelectedLang] = useState("en");
  const [animating, setAnimating] = useState(false);

  // Always read translation for currently selected language
  const t = TRANSLATIONS[selectedLang];

  const goToStep2 = (code) => {
    setSelectedLang(code);
    setLang(code); // apply language immediately
    setAnimating(true);
    setTimeout(() => {
      setStep(2);
      setAnimating(false);
    }, 300);
  };

  const goBack = () => {
    setAnimating(true);
    setTimeout(() => {
      setStep(1);
      setAnimating(false);
    }, 300);
  };

  const handleStart = () => {
    localStorage.setItem("lfu-intro-done", "true");
    localStorage.setItem("lfu-lang", selectedLang);
    setLang(selectedLang);
    onComplete(selectedLang);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.orb1} />
      <div className={styles.orb2} />

      <div
        className={`${styles.modal} ${animating ? styles.modalOut : styles.modalIn}`}
      >
        {/* Logo */}
        <div className={styles.logoWrap}>
          <div className={styles.logo}><LFULogo size={28} /></div>
          <span className={styles.logoText}>LFU AI</span>
        </div>

        {/* ── Step 1: Language ── */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h1 className={styles.title}>{TRANSLATIONS["en"].chooseLanguage}</h1>
            <p className={styles.subtitle}>{TRANSLATIONS["en"].chooseLanguageSub}</p>

            <div className={styles.langGrid}>
              {LANG_LIST.map((l) => (
                <button
                  key={l.code}
                  className={`${styles.langCard} ${selectedLang === l.code ? styles.langCardActive : ""}`}
                  onClick={() => goToStep2(l.code)}
                >
                  <span className={styles.langNative}>{l.native}</span>
                  <span className={styles.langLabel}>{l.label}</span>
                  {selectedLang === l.code && (
                    <span className={styles.checkMark}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 2: LFU Intro ── */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <div className={styles.introIcon}>
              <LFULogo size={52} />
            </div>

            <h1 className={styles.title}>{t.welcomeTitle}</h1>
            <p className={styles.introBody}>{t.welcomeBody}</p>
            <p className={styles.introSub}>{t.welcomeSub}</p>

            <div className={styles.featureRow}>
              <div className={styles.featureChip}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                {t.lfuFull}
              </div>
              <div className={styles.featureChip}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
                {t.worldKnowledge}
              </div>
              <div className={styles.featureChip}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                {t.available}
              </div>
            </div>

            <div className={styles.actionRow}>
              <button className={styles.backBtn} onClick={goBack}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                {t.back}
              </button>
              <button className={styles.startBtn} onClick={handleStart}>
                {t.start}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* Step dots */}
        <div className={styles.dots}>
          <span className={`${styles.dot} ${step === 1 ? styles.dotActive : ""}`} />
          <span className={`${styles.dot} ${step === 2 ? styles.dotActive : ""}`} />
        </div>
      </div>
    </div>
  );
}
