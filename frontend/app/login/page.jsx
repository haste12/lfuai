'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/layout/Navbar';
import { useAuth } from '../../context/AuthContext';
import styles from './page.module.css';

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
    <>
      <Navbar />
      <main className={styles.main}>
        <div
          className="glow-orb"
          style={{ width: 400, height: 400, background: 'rgba(124,106,247,0.12)', top: '10%', left: '50%', transform: 'translateX(-50%)' }}
        />

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.logo}>⬡</span>
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
            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-faint)' }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
              <span style={{ padding: '0 10px', fontSize: '13px' }}>or</span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }}></div>
            </div>
            <button 
              type="button"
              onClick={handleGoogleSignIn} 
              className={`btn btn-primary ${styles.submitBtn}`} 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', background: 'white', color: '#333', border: '1px solid #ccc' }}
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google logo" 
                style={{ width: '20px', height: '20px' }} 
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
    </>
  );
}

function getFriendlyError(err) {
  console.error("Firebase Login Error:", err);
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
