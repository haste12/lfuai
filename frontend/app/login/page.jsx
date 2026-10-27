'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import styles from './page.module.css';

const LFULogo = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect width="40" height="40" rx="10" fill="#2563eb"/>
    <path d="M10 10h6v14h10v6H10V10z" fill="white" opacity="0.9"/>
    <path d="M28 10h-6v8h6v-8z" fill="white" opacity="0.7"/>
  </svg>
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

function getFriendlyError(err) {
  const map = {
    'auth/popup-closed-by-user': 'Sign-in popup was closed. Please try again.',
    'auth/popup-blocked': 'Popup was blocked by your browser. Allow popups and try again.',
    'auth/cancelled-popup-request': 'Another sign-in is in progress.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[err?.code] || err?.message || 'Sign in failed. Please try again.';
}

export default function LoginPage() {
  const { signInWithGoogle } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      router.push('/chat');
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <LFULogo size={44} />
          <h1 className={styles.title}>Welcome to LFU AI</h1>
          <p className={styles.subtitle}>Sign in with your Google account to continue</p>
        </div>

        {error && (
          <div className={styles.errorBox} role="alert">{error}</div>
        )}

        <button
          className={styles.googleBtn}
          onClick={handleGoogle}
          disabled={loading}
          id="google-signin-btn"
        >
          {loading ? (
            <span className={styles.spinner} />
          ) : (
            <GoogleIcon />
          )}
          <span>{loading ? 'Signing in…' : 'Continue with Google'}</span>
        </button>

        <div className={styles.divider}><span>or</span></div>

        <Link href="/chat" className={styles.guestLink}>
          Continue as guest →
        </Link>

        <p className={styles.footer}>
          By continuing, you agree to our{' '}
          <span className={styles.footerMuted}>Terms of Service</span>
        </p>
      </div>
    </main>
  );
}
