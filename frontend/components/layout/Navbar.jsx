'use client';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLang } from '../../context/LanguageContext';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

/* LFU Logo — chat bubble with sparkle star */
function LFULogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="navLogoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6c63ff"/>
          <stop offset="1" stopColor="#00b4d8"/>
        </linearGradient>
      </defs>
      {/* Chat bubble */}
      <path d="M50 5C25.1 5 5 23.4 5 46c0 11.8 5.2 22.5 13.6 30L14 92l18.5-8.4C37.1 85 43.4 86 50 86c24.9 0 45-18.4 45-40S74.9 5 50 5z" fill="url(#navLogoGrad)"/>
      {/* Inner white circle */}
      <circle cx="50" cy="46" r="22" fill="white" opacity="0.9"/>
      {/* Sparkle star */}
      <path d="M50 28c0 0-3 9-9 12 6 3 9 12 9 12s3-9 9-12c-6-3-9-12-9-12z" fill="url(#navLogoGrad)"/>
    </svg>
  );
}

export default function Navbar() {
  const { user, userData, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLang();
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/chat" className={styles.logo}>
          <LFULogo size={30} />
          <span className={styles.logoText}>
            LFU <span className={styles.logoAI}>AI</span>
          </span>
        </Link>

        {/* Center nav links */}
        <ul className={styles.links}>
          <li>
            <Link href="/chat" className={`${styles.link} ${pathname === '/chat' ? styles.active : ''}`}>
              {t.aiChat}
            </Link>
          </li>
          {userData?.role === 'admin' && (
            <li>
              <Link href="/admin" className={`${styles.link} ${pathname === '/admin' ? styles.active : ''}`}>
                {t.admin}
              </Link>
            </li>
          )}
        </ul>

        {/* Right side */}
        <div className={styles.auth}>
          {user ? (
            <>
              <span className={styles.userInfo}>
                <span className={styles.dot} />
                {userData?.displayName || user.email}
              </span>
              <button className={styles.themeToggle} onClick={toggleTheme} title={theme === 'light' ? t.darkMode : t.lightMode}>
                {theme === 'light' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
                )}
              </button>
              <Link href="/profile" className={styles.profileBtn}>
                <span className={styles.profileAvatar}>
                  {userData?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                </span>
              </Link>
              <button className={styles.logoutBtn} onClick={logout}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
                {t.logout}
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={styles.loginBtn}>{t.login}</Link>
              <Link href="/register" className={styles.startBtn}>{t.getStarted}</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
