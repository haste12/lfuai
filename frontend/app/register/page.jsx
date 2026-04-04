'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/layout/Navbar';
import { useAuth } from '../../context/AuthContext';
import styles from '../login/page.module.css';

export default function RegisterPage() {
  const { signInWithGoogle } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      router.push('/chat');
    } catch (err) {
      setError(err.message || 'Registration failed.');
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
          style={{ width: 400, height: 400, background: 'rgba(6,214,160,0.08)', top: '10%', left: '50%', transform: 'translateX(-50%)' }}
        />

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.logo}>⬡</span>
            <h1 className={styles.title}>Create account</h1>
            <p className={styles.subtitle}>Join LFU AI for free — no credit card needed</p>
          </div>

          {error && <div className={styles.errorBox}>{error}</div>}

          <div className={styles.form} style={{ marginTop: '20px' }}>
            <button 
              onClick={handleGoogleSignIn} 
              className={`btn btn-primary ${styles.submitBtn}`} 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', background: 'white', color: '#333', border: '1px solid #ccc' }}
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                alt="Google logo" 
                style={{ width: '20px', height: '20px' }} 
              />
              {loading ? 'Continuing...' : 'Sign up with Google'}
            </button>
          </div>

          <p className={styles.footer}>
            Already have an account?{' '}
            <Link href="/login" className={styles.link}>Sign in</Link>
          </p>
        </div>
      </main>
    </>
  );
}
