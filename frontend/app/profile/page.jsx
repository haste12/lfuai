'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

/* LFU Logo */
function LFULogo({ size = 52 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="profLogoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6c63ff"/>
          <stop offset="1" stopColor="#00b4d8"/>
        </linearGradient>
      </defs>
      <path d="M50 5C25.1 5 5 23.4 5 46c0 11.8 5.2 22.5 13.6 30L14 92l18.5-8.4C37.1 85 43.4 86 50 86c24.9 0 45-18.4 45-40S74.9 5 50 5z" fill="url(#profLogoGrad)"/>
      <circle cx="50" cy="46" r="22" fill="white" opacity="0.9"/>
      <path d="M50 28c0 0-3 9-9 12 6 3 9 12 9 12s3-9 9-12c-6-3-9-12-9-12z" fill="url(#profLogoGrad)"/>
    </svg>
  );
}

const LANG_OPTIONS = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'ar', label: 'Arabic', native: 'العربية' },
  { code: 'ku', label: 'Kurdish', native: 'کوردی' },
];

export default function ProfilePage() {
  const { user, userData, updateProfileName, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang } = useLang();
  const [name, setName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (userData) {
      setName(userData.displayName || '');
    }
  }, [user, userData, loading, router]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsUpdating(true);
    setMessage('');
    try {
      await updateProfileName(name.trim());
      setMessage(t.profileUpdated);
    } catch (err) {
      setMessage(t.profileFailed);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading || !user) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingLogo}><LFULogo size={52} /></div>
        <p className={styles.loadingText}>{t.loadingText}</p>
      </div>
    );
  }

  const isSuccess = message.includes('success') || message.includes('بەسەرکەوتوویی') || message.includes('بنجاح');

  return (
    <div className={styles.page}>
      {/* Back button */}
      <button className={styles.backBtn} onClick={() => router.push('/chat')}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        {t.aiChat}
      </button>

      <main className={styles.main}>
        <div className={styles.card}>

          {/* Header */}
          <div className={styles.cardHeader}>
            <div className={styles.avatarWrap}>
              <div className={styles.avatarLg}>
                {userData?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <div className={styles.logoOverlay}><LFULogo size={28} /></div>
            </div>
            <h1 className={styles.title}>{t.yourProfile}</h1>
            <p className={styles.subtitle}>{user.email}</p>
          </div>

          {/* Divider */}
          <div className={styles.divider} />

          {/* Display Name */}
          <form onSubmit={handleUpdate} className={styles.form}>
            {message && (
              <div className={isSuccess ? styles.successBox : styles.errorBox}>
                {isSuccess ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                )}
                {message}
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>{t.displayName}</label>
              <input
                id="name"
                type="text"
                className={styles.input}
                placeholder={t.enterYourName}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isUpdating || !name.trim()}>
              {isUpdating ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{animation:'spin 1s linear infinite'}}>
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
                  </svg>
                  {t.saving}
                </>
              ) : t.saveChanges}
            </button>
          </form>

          <div className={styles.divider} />

          {/* Theme Toggle */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>{t.changeTheme}</div>
            <div className={styles.themeToggleRow}>
              <button
                className={`${styles.themeOption} ${theme === 'light' ? styles.themeOptionActive : ''}`}
                onClick={() => theme === 'dark' && toggleTheme()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="4"/>
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                </svg>
                {t.lightMode}
              </button>
              <button
                className={`${styles.themeOption} ${theme === 'dark' ? styles.themeOptionActive : ''}`}
                onClick={() => theme === 'light' && toggleTheme()}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
                </svg>
                {t.darkMode}
              </button>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Language Selector */}
          <div className={styles.section}>
            <div className={styles.sectionLabel}>{t.language}</div>
            <div className={styles.langRow}>
                          {LANG_OPTIONS.map((l) => (
                <button
                  key={l.code}
                  className={`${styles.langOption} ${lang === l.code ? styles.langOptionActive : ''}`}
                  onClick={() => setLang(l.code)}
                >
                  <span className={styles.langNative}>{l.native}</span>
                  <span className={styles.langLabel}>{l.label}</span>
                  {lang === l.code && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={styles.langCheck}>
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.divider} />

          {/* Logout */}
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            {t.logout}
          </button>

        </div>
      </main>
    </div>
  );
}
