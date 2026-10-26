'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import styles from './page.module.css';

/* LFU Logo — chat bubble with sparkle */
function LFULogo({ size = 60 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="loginLogoGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6c63ff"/>
          <stop offset="1" stopColor="#00b4d8"/>
        </linearGradient>
      </defs>
      <path d="M50 5C25.1 5 5 23.4 5 46c0 11.8 5.2 22.5 13.6 30L14 92l18.5-8.4C37.1 85 43.4 86 50 86c24.9 0 45-18.4 45-40S74.9 5 50 5z" fill="url(#loginLogoGrad)"/>
      <circle cx="50" cy="46" r="22" fill="white" opacity="0.9"/>
      <path d="M50 28c0 0-3 9-9 12 6 3 9 12 9 12s3-9 9-12c-6-3-9-12-9-12z" fill="url(#loginLogoGrad)"/>
    </svg>
  );
}

export default function LoginPage() {
  const { login, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      router.push('/chat');
    } catch (err) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      router.push('/chat');
    } catch (err) {
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      {/* Ambient glow */}
      <div
        className="glow-orb"
        style={{ width: 400, height: 400, background: 'rgba(108,99,255,0.1)', top: '5%', left: '50%', transform: 'translateX(-50%)' }}
      />

      <div className={styles.card}>
        {/* Header with LFU Logo */}
        <div className={styles.cardHeader}>
          <div className={styles.logoWrap}>
            <LFULogo size={64} />
          </div>
          <h1 className={styles.title}>Welcome back</h1>
          <p className={styles.subtitle}>Sign in to your LFU AI account</p>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email address</label>
            <input
              id="email"
              type="email"
              className="input"
              placeholder="you@lfu.edu.krd"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className={`btn btn-primary ${styles.submitBtn}`}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0', color: 'var(--text-faint)' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
            <span style={{ padding: '0 12px', fontSize: '12px' }}>or</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className={styles.googleBtn}
            disabled={loading}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google logo"
              style={{ width: '18px', height: '18px' }}
            />
            Sign in with Google
          </button>
        </form>

        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/register" className={styles.link}>Create one</Link>
        </p>
      </div>
    </main>
  );
}

function getFriendlyError(err) {
  console.error('Firebase Login Error:', err);
  const errors = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/invalid-api-key': 'API Key Error: Please restart your Next.js server so it loads the new .env.local file!',
  };
  return errors[err.code] || err.message || 'Login failed. Please try again.';
}
