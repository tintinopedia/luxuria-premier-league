import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const SUPERADMIN_EMAIL = (process.env.NEXT_PUBLIC_SUPERADMIN_EMAIL || 'ahaan@tintinopedia.com').toLowerCase();

let _app, _db;
export function fbApp() {
  if (!_app) _app = getApps()[0] || initializeApp(config);
  return _app;
}
export const auth = () => getAuth(fbApp());
export function db() {
  if (!_db) {
    try { _db = initializeFirestore(fbApp(), { ignoreUndefinedProperties: true }); }
    catch { _db = getFirestore(fbApp()); }
  }
  return _db;
}
export const storage = () => getStorage(fbApp());
export const googleProvider = () => {
  const p = new GoogleAuthProvider();
  p.setCustomParameters({ prompt: 'select_account' });
  return p;
};
