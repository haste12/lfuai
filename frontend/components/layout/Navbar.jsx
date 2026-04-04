'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

const NAV_LINKS = [
  { href: '/chat', label: 'AI Chat' },
];

export default function Navbar() {
  const { user, userData, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {/* Logo */}
        <Link href="/chat" className={styles.logo}>
          <span className={styles.logoIcon}>⬡</span>
          <span className={styles.logoText}>
            LFU <span className="gradient-text">AI</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <ul className={styles.links}>
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className={`${styles.link} ${pathname === href ? styles.active : ''}`}
              >
                {label}
              </Link>
            </li>
          ))}
          {userData?.role === 'admin' && (
            <li>
              <Link
                href="/admin"
                className={`${styles.link} ${pathname === '/admin' ? styles.active : ''}`}
              >
                Admin
              </Link>
            </li>
          )}
        </ul>

        {/* Auth buttons */}
        <div className={styles.auth}>
          {user ? (
            <>
              <span className={styles.userInfo}>
                <span className={styles.dot} />
                {userData?.displayName || user.email}
              </span>
              <button className="btn btn-ghost" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost">Login</Link>
              <Link href="/register" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>

        {/* Mobile Burger */}
        <button
          className={styles.burger}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className={menuOpen ? styles.burgerBarOpen : styles.burgerBar} />
          <span className={menuOpen ? styles.burgerBarOpen : styles.burgerBar} />
          <span className={menuOpen ? styles.burgerBarOpen : styles.burgerBar} />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          {!user ? (
            <>
              <Link href="/login" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>Login</Link>
              <Link href="/register" className={`btn btn-primary ${styles.mobileCta}`} onClick={() => setMenuOpen(false)}>Get Started</Link>
            </>
          ) : (
            <button className={styles.mobileLink} onClick={() => { logout(); setMenuOpen(false); }}>
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
