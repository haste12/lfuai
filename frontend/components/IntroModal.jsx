"use client";
import { useState } from "react";
import { useLang, TRANSLATIONS } from "../context/LanguageContext";
import styles from "./IntroModal.module.css";

const LFULogo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="10" fill="#2563eb"/>
    <path d="M10 10h6v14h10v6H10V10z" fill="white" opacity="0.9"/>
    <path d="M28 10h-6v8h6v-8z" fill="white" opacity="0.7"/>
  </svg>
);

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

  const t = TRANSLATIONS[selectedLang];

  const goToStep2 = (code) => {
    setSelectedLang(code);
    setLang(code);
    setAnimating(true);
    setTimeout(() => { setStep(2); setAnimating(false); }, 250);
  };

  const goBack = () => {
    setAnimating(true);
    setTimeout(() => { setStep(1); setAnimating(false); }, 250);
  };

  const handleStart = () => {
    localStorage.setItem("lfu-intro-done", "true");
    localStorage.setItem("lfu-lang", selectedLang);
    setLang(selectedLang);
    onComplete(selectedLang);
  };

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${animating ? styles.modalOut : styles.modalIn}`}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <LFULogo size={28} />
          <span className={styles.logoText}>LFU AI</span>
        </div>

        {/* Step 1: Language selection */}
        {step === 1 && (
          <div className={styles.stepContent}>
            <h1 className={styles.title}>{TRANSLATIONS["en"].chooseLanguage}</h1>
            <p className={styles.subtitle}>Select your preferred language to get started.</p>
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
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Welcome */}
        {step === 2 && (
          <div className={styles.stepContent}>
            <div className={styles.introIcon}><LFULogo size={48} /></div>
            <h1 className={styles.title}>{t.welcomeTitle2 || t.welcomeTitle}</h1>
            <p className={styles.introBody}>{t.welcomeBody}</p>

            <div className={styles.actionRow}>
              <button className={styles.backBtn} onClick={goBack}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                {t.back}
              </button>
              <button className={styles.startBtn} onClick={handleStart}>
                {t.start}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
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
