import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = initializeFirestore(
  app,
  { experimentalAutoDetectLongPolling: true },
  'ai-studio-launchtrackerpro-3a295d8c-0fdf-4d99-9e85-0dbaf6a3fcad'
);

export const initAuth = (
  onAuthSuccess?: (user: User) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  });
};
