'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../components/layout/Navbar';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../lib/api';
import styles from './page.module.css';

export default function AdminPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!user) { router.push('/login'); return; }
      if (userData?.role !== 'admin') { router.push('/chat'); return; }
      loadUsers();
    }
  }, [user, userData, loading]);

  async function loadUsers() {
    try {
      const data = await userApi.getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  async function toggleSuspend(uid, currentStatus) {
    try {
      await userApi.updateUser(uid, { suspended: !currentStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, suspended: !currentStatus } : u))
      );
    } catch (err) {
      alert(err.message);
    }
  }

  async function updateLimit(uid, limit) {
    const val = limit === '' ? null : parseInt(limit, 10);
    try {
      await userApi.updateUser(uid, { dailyLimit: val });
      setUsers((prev) => prev.map((u) => (u.id === uid ? { ...u, dailyLimit: val } : u)));
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading || fetching) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #333', borderTopColor: '#7c6af7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Admin Dashboard</h1>
            <p className={styles.subtitle}>{users.length} registered users</p>
          </div>
        </div>

        {error && <div className={styles.errorBox}>{error}</div>}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Daily Limit</th>
                <th>Messages</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.suspended ? styles.suspendedRow : ''}>
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.avatar}>{u.displayName?.[0]?.toUpperCase() || '?'}</div>
                      <span>{u.displayName || 'N/A'}</span>
                    </div>
                  </td>
                  <td className={styles.muted}>{u.email}</td>
                  <td>
                    <input
                      type="number"
                      className={styles.limitInput}
                      defaultValue={u.dailyLimit ?? ''}
                      placeholder="∞"
                      onBlur={(e) => updateLimit(u.id, e.target.value)}
                    />
                  </td>
                  <td className={styles.muted}>{u.messageCount ?? 0}</td>
                  <td>
                    <span className={`${styles.badge} ${u.suspended ? styles.badgeDanger : styles.badgeSuccess}`}>
                      {u.suspended ? 'Suspended' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`btn ${u.suspended ? 'btn-primary' : 'btn-ghost'} ${styles.actionBtn}`}
                      onClick={() => toggleSuspend(u.id, u.suspended)}
                    >
                      {u.suspended ? 'Reinstate' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
