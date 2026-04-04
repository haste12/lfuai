const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let _db = null;

function getDb() {
  if (_db) return _db;

  try {
    // If already initialized (e.g. hot-reload), reuse
    if (admin.apps.length > 0) {
      _db = admin.firestore();
      return _db;
    }

    let credential;

    // Option 1: local serviceAccountKey.json in backend/
    const keyPath = path.resolve(__dirname, '../../serviceAccountKey.json');
    if (fs.existsSync(keyPath)) {
      credential = admin.credential.cert(keyPath);
      console.log('✅ Firebase: loaded from serviceAccountKey.json');
    } else {
      // Option 2: individual environment variables
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
      const serviceAccount = {
        type: 'service_account',
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
      };

      const required = ['project_id', 'private_key', 'client_email'];
      const missing = required.filter((k) => !serviceAccount[k] || serviceAccount[k].includes('your_'));
      if (missing.length > 0) {
        throw new Error(
          `Firebase not configured. Add your credentials to backend/.env or place serviceAccountKey.json in backend/.\nMissing/placeholder: ${missing.join(', ')}`
        );
      }

      credential = admin.credential.cert(serviceAccount);
      console.log('✅ Firebase: loaded from environment variables');
    }

    admin.initializeApp({ credential });
    _db = admin.firestore();
    return _db;
  } catch (err) {
    console.error('❌ Firebase init error:', err.message);
    throw err;
  }
}

// Lazy proxy: exports look like { db } but db is resolved on first access
module.exports = { get db() { return getDb(); }, admin };

