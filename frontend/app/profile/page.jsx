'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

const LFULogo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="10" fill="#2563eb"/>
    <path d="M10 10h6v14h10v6H10V10z" fill="white" opacity="0.9"/>
    <path d="M28 10h-6v8h6v-8z" fill="white" opacity="0.7"/>
  </svg>
);

const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
);

export default function ProfilePage() {
  const { user, userData, updateProfileName, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, setLang, translations } = useLang();
  const router = useRouter();

  const [name, setName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (!loading && !user) router.push('/login');
    else if (userData) setName(userData.displayName || '');
  }, [user, userData, loading, router]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsUpdating(true);
    setMessage({ text: '', type: '' });
    try {
      await updateProfileName(name.trim());
      setMessage({ text: t.profileUpdated, type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch {
      setMessage({ text: t.profileFailed, type: 'error' });
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
        <LFULogo size={40} />
        <p className={styles.loadingText}>{t.loadingText}</p>
      </div>
    );
  }

  const initial = (userData?.displayName || user?.email || '?')[0]?.toUpperCase();

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => router.push('/chat')}>
        <BackIcon />
        <span>Back to Chat</span>
      </button>

      <main className={styles.main}>
        <div className={styles.card}>
          {/* Header */}
          <div className={styles.cardHeader}>
            <div className={styles.avatarLg}>{initial}</div>
            <div>
              <h1 className={styles.title}>{userData?.displayName || 'Student'}</h1>
              <p className={styles.subtitle}>{user.email}</p>
            </div>
          </div>

          <div className={styles.divider} />

          {/* Display Name */}
          <div className={styles.section}>
            <h2 className={styles.sectionLabel}>{t.displayName}</h2>
            <form onSubmit={handleUpdate} className={styles.form}>
              {message.text && (
                <div className={message.type === 'success' ? styles.successBox : styles.errorBox}>
                  {message.type === 'success' && <CheckIcon />}
                  {message.text}
                </div>
              )}
              <input
                id="name"
                type="text"
                className="input"
                placeholder={t.enterYourName}
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
              <button
                type="submit"
                className={`btn btn-primary ${styles.submitBtn}`}
                disabled={isUpdating || !name.trim()}
              >
                {isUpdating ? t.saving : t.saveChanges}
              </button>
            </form>
          </div>

          <div className={styles.divider} />

          {/* Theme */}
          <div className={styles.section}>
            <h2 className={styles.sectionLabel}>{t.appearance}</h2>
            <div className={styles.optionRow}>
              {['light', 'dark'].map(opt => (
                <button
                  key={opt}
                  className={`${styles.optionBtn} ${theme === opt ? styles.optionBtnActive : ''}`}
                  onClick={() => theme !== opt && toggleTheme()}
                >
                  {opt === 'light' ? t.lightMode : t.darkMode}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.divider} />

          {/* Language */}
          <div className={styles.section}>
            <h2 className={styles.sectionLabel}>{t.language}</h2>
            <div className={styles.optionRow}>
              {Object.entries(translations).map(([code, tr]) => (
                <button
                  key={code}
                  className={`${styles.optionBtn} ${lang === code ? styles.optionBtnActive : ''}`}
                  onClick={() => setLang(code)}
                >
                  {tr.langLabel}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.divider} />

          {/* Logout */}
          <button className={`btn btn-ghost ${styles.logoutBtn}`} onClick={handleLogout}>
            {t.logout}
          </button>
        </div>
      </main>
    </div>
  );
}
