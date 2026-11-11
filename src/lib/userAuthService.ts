import {
  User,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signOut,
} from 'firebase/auth';
import { AppUser, UserRole } from './types';
import { auth } from './auth';
import { FirebaseUserAdminApi, isValidRole } from './firebaseUserAdminApi';

const STORAGE_KEY_USERS = 'launch_tracker_users_db';
const SESSION_KEY_USER = 'launch_tracker_active_session';

const usernameAuthEmail = (username: string): string => {
  const normalized = username.trim().toLowerCase();
  const encoded = Array.from(new TextEncoder().encode(normalized))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `u-${encoded}@project-tracker.firebaseapp.com`;
};

const appUserFromCredential = async (
  firebaseUser: Awaited<ReturnType<typeof signInWithEmailAndPassword>>['user']
): Promise<AppUser> => {
  const tokenResult = await firebaseUser.getIdTokenResult(true);
  const { username, role } = tokenResult.claims;
  if (typeof username !== 'string' || !isValidRole(role)) {
    await signOut(auth);
    throw new Error(
      'This account has no Project Tracker role yet. Ask an Admin to sync accounts.'
    );
  }
  const user: AppUser = {
    id: firebaseUser.uid,
    username,
    role,
    displayName: firebaseUser.displayName || username,
    password: '',
    failedAttempts: 0,
    isLocked: false,
    createdAt: firebaseUser.metadata.creationTime
      ? new Date(firebaseUser.metadata.creationTime).getTime()
      : Date.now(),
  };
  UserAuthService.setCurrentSession(user);
  return user;
};

export class UserAuthService {
  static initDefaultUsers(): void {
    this.getUsers();
  }

  static getUsers(): AppUser[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USERS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Could not read saved account list:', error);
      return [];
    }
  }

  static saveUsers(users: AppUser[]): void {
    try {
      localStorage.setItem(
        STORAGE_KEY_USERS,
        JSON.stringify(users.map((user) => ({ ...user, password: '' })))
      );
    } catch (error) {
      console.error('Could not save account list:', error);
    }
  }

  static getCurrentSession(): AppUser | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY_USER);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.error('Could not read current account session:', error);
      return null;
    }
  }

  static setCurrentSession(user: AppUser | null): void {
    try {
      if (user) {
        sessionStorage.setItem(
          SESSION_KEY_USER,
          JSON.stringify({ ...user, password: '' })
        );
      } else {
        sessionStorage.removeItem(SESSION_KEY_USER);
      }
    } catch (error) {
      console.error('Could not save current account session:', error);
    }
  }

  static async login(
    usernameInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; user?: AppUser; error?: string }> {
    const username = usernameInput.trim();
    if (!username || !passwordInput) {
      return { success: false, error: 'Please enter both username and password.' };
    }
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        usernameAuthEmail(username),
        passwordInput
      );
      const user = await appUserFromCredential(credential.user);
      return { success: true, user };
    } catch (error) {
      console.error('Username and password sign-in failed:', error);
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : '';
      return {
        success: false,
        error:
          code === 'auth/operation-not-allowed'
            ? 'Enable Email/Password in Firebase Authentication before signing in.'
            : code === 'auth/too-many-requests'
              ? 'Too many sign-in attempts. Please wait and try again.'
              : error instanceof Error
                ? error.message
                : 'Invalid username or password.',
      };
    }
  }

  static async bootstrapAdmin(
    username: string,
    password: string,
    setupSecret: string
  ): Promise<AppUser> {
    const { customToken } = await FirebaseUserAdminApi.bootstrapAdmin(
      username,
      password,
      setupSecret,
      username
    );
    const credential = await signInWithCustomToken(auth, customToken);
    return appUserFromCredential(credential.user);
  }

  static async restoreSession(firebaseUser: User): Promise<AppUser> {
    return appUserFromCredential(firebaseUser);
  }

  static async logout(): Promise<void> {
    this.setCurrentSession(null);
    await signOut(auth);
  }

  static async listFirebaseUsers(): Promise<AppUser[]> {
    const { users } = await FirebaseUserAdminApi.listUsers();
    this.saveUsers(users);
    return users;
  }

  static async syncAccounts(): Promise<AppUser[]> {
    const { users } = await FirebaseUserAdminApi.syncAccounts(this.getUsers());
    this.saveUsers(users);
    return users;
  }

  static async createFirebaseUser(
    input: Omit<AppUser, 'id' | 'createdAt' | 'failedAttempts' | 'isLocked'>
  ): Promise<AppUser> {
    const { user } = await FirebaseUserAdminApi.createUser(input);
    const users = this.getUsers().filter(
      (existing) =>
        existing.username.toLowerCase() !== user.username.toLowerCase()
    );
    users.push(user);
    this.saveUsers(users);
    return user;
  }

  static async updateFirebaseUser(
    user: Pick<AppUser, 'id' | 'username' | 'role' | 'displayName'>
  ): Promise<AppUser> {
    const { user: updated } = await FirebaseUserAdminApi.updateUser(user);
    const users = this.getUsers().map((existing) =>
      existing.id === updated.id ? updated : existing
    );
    this.saveUsers(users);
    if (auth.currentUser?.uid === updated.id) {
      this.setCurrentSession(updated);
      await FirebaseUserAdminApi.refreshClaims();
    }
    return updated;
  }

  static async resetFirebasePassword(
    id: string,
    password: string
  ): Promise<void> {
    await FirebaseUserAdminApi.resetPassword(id, password);
  }

  static async setFirebaseUserDisabled(
    id: string,
    disabled: boolean
  ): Promise<void> {
    await FirebaseUserAdminApi.setDisabled(id, disabled);
    const users = this.getUsers().map((user) =>
      user.id === id ? { ...user, isLocked: disabled } : user
    );
    this.saveUsers(users);
  }

  static getFirebaseRole(role: unknown): UserRole | null {
    return isValidRole(role) ? role : null;
  }

  static isUrlViewOnly(): boolean {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return (
      /^#view\/[^&]+/.test(hash) ||
      hash.includes('view-only') ||
      hash.includes('readonly') ||
      search.includes('view=readonly') ||
      search.includes('mode=view')
    );
  }
}
