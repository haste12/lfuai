'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const ref = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(ref);
        setUserData(snap.exists() ? snap.data() : null);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
    await setDoc(doc(db, 'users', cred.user.uid), {
      email,
      displayName,
      dailyLimit: 20,
      messageCount: 0,
      suspended: false,
      createdAt: new Date(),
      lastResetTime: new Date(),
      role: 'user',
    });
    return cred;
  }

  async function logout() {
    await signOut(auth);
  }

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const user = cred.user;
    
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    
    if (!snap.exists()) {
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName || 'Google User',
        dailyLimit: 20,
        messageCount: 0,
        suspended: false,
        createdAt: new Date(),
        lastResetTime: new Date(),
        role: 'user',
      });
    }
    return cred;
  }

  async function updateProfileName(newName) {
    if (!user) return;
    try {
      await updateProfile(user, { displayName: newName });
    } catch(e) {
      console.warn("Could not update auth profile", e);
    }
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, { displayName: newName }, { merge: true });
    setUserData(prev => ({ ...prev, displayName: newName }));
  }

  return (
    <AuthContext.Provider value={{ user, userData, loading, login, register, logout, signInWithGoogle, updateProfileName }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
