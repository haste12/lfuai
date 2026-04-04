'use client';

import { useState, useEffect } from 'react';
import Navbar from '../../components/layout/Navbar';
import { useAuth } from '../../context/AuthContext';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, userData, updateProfileName, loading } = useAuth();
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
      setMessage('Profile updated successfully!');
    } catch (err) {
      setMessage('Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  if (loading || !user) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.avatarLg}>
              {userData?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <h1 className={styles.title}>Your Profile</h1>
            <p className={styles.subtitle}>{user.email}</p>
          </div>

          <form onSubmit={handleUpdate} className={styles.form}>
            {message && (
              <div className={message.includes('success') ? styles.successBox : styles.errorBox}>
                {message}
              </div>
            )}
            
            <div className={styles.field}>
              <label htmlFor="name" className={styles.label}>Display Name</label>
              <input
                id="name"
                type="text"
                className={styles.input}
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <button type="submit" className={`btn btn-primary ${styles.submitBtn}`} disabled={isUpdating || !name.trim()}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
