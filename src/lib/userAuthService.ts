import {
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { AppUser, UserRole } from './types';
import { auth, usernameAuthEmail } from './auth';
import { FirebaseUserAdminApi } from './firebaseUserAdminApi';

const STORAGE_KEY_USERS = 'launch_tracker_users_db';
const SESSION_KEY_USER = 'launch_tracker_active_session';

export const DEFAULT_ADMIN: AppUser = {
  id: 'user_waranyac',
  username: 'waranyac',
  password: '',
  role: 'Admin',
  displayName: 'Waranya (Owner / Admin)',
  failedAttempts: 0,
  isLocked: false,
  createdAt: Date.now(),
};

export class UserAuthService {
  static initDefaultUsers(): void {
    this.getUsers();
  }

  // Retrieve all users from storage (or seed default admin if empty)
  static getUsers(): AppUser[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USERS);
      if (!raw) {
        this.saveUsers([DEFAULT_ADMIN]);
        return [DEFAULT_ADMIN];
      }
      const parsed: AppUser[] = JSON.parse(raw);
      // Ensure default admin always exists
      if (!parsed.some((u) => u.username.toLowerCase() === DEFAULT_ADMIN.username.toLowerCase())) {
        parsed.unshift(DEFAULT_ADMIN);
        this.saveUsers(parsed);
      }
      return parsed;
    } catch {
      return [DEFAULT_ADMIN];
    }
  }

  static saveUsers(users: AppUser[]): void {
    try {
      const safeUsers = users.map((user) =>
        user.id.startsWith('usr_') || user.id.startsWith('user_')
          ? user
          : { ...user, password: '' }
      );
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(safeUsers));
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  // Get active session from sessionStorage (cleared automatically on tab/window close)
  static getCurrentSession(): AppUser | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY_USER);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // Set active session in sessionStorage
  static setCurrentSession(user: AppUser | null): void {
    try {
      if (user) {
        // Exclude plain password from active session memory
        const safeSession = { ...user, password: '' };
        sessionStorage.setItem(SESSION_KEY_USER, JSON.stringify(safeSession));
      } else {
        sessionStorage.removeItem(SESSION_KEY_USER);
      }
    } catch {
      // ignore
    }
  }

  // Login attempt with 5-strike lock logic
  static async login(
    usernameInput: string,
    passwordInput: string
  ): Promise<{ success: boolean; user?: AppUser; error?: string; isLocked?: boolean }> {
    const username = usernameInput.trim();
    const password = passwordInput;

    if (!username || !password) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    const users = this.getUsers();
    const userIndex = users.findIndex(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    const targetUser = userIndex >= 0 ? users[userIndex] : undefined;

    if (targetUser?.isLocked) {
      return {
        success: false,
        isLocked: true,
        error:
          'This account is locked after 5 failed login attempts. Please contact the system owner (waranyac) to unlock or reset your password.',
      };
    }

    const email = usernameAuthEmail(username);
    let firebaseUser;
    try {
      firebaseUser = (
        await signInWithEmailAndPassword(auth, email, password)
      ).user;
    } catch (signInError) {
      const code =
        signInError && typeof signInError === 'object' && 'code' in signInError
          ? String(signInError.code)
          : '';
      if (
        targetUser &&
        (targetUser.id.startsWith('usr_') ||
          targetUser.id.startsWith('user_')) &&
        targetUser.password === password &&
        (code === 'auth/user-not-found' || code === 'auth/invalid-credential')
      ) {
        this.setCurrentSession(targetUser);
        return { success: true, user: targetUser };
      }
      if (
        code === 'auth/operation-not-allowed' ||
        code === 'auth/network-request-failed' ||
        code === 'auth/too-many-requests'
      ) {
        return {
          success: false,
          error:
            code === 'auth/operation-not-allowed'
              ? 'Enable Email/Password in Firebase Authentication before using username/password sign-in.'
              : 'Firebase sign-in is temporarily unavailable. Please try again.',
        };
      }
      if (!targetUser || targetUser.password !== password) {
        return this.recordFailedLogin(users, userIndex);
      }
      return this.recordFailedLogin(users, userIndex);
    }

    const tokenResult = await firebaseUser.getIdTokenResult(true);
    const role = tokenResult.claims.role;
    const usernameClaim = tokenResult.claims.username;
    if (
      (role !== 'Admin' && role !== 'Editor' && role !== 'Viewer') ||
      typeof usernameClaim !== 'string'
    ) {
      await signOut(auth);
      return {
        success: false,
        error:
          'This Firebase account is not assigned a Project Tracker role. Ask an Admin to sync accounts.',
      };
    }

    const authenticatedUser: AppUser = {
      ...(targetUser || {}),
      id: firebaseUser.uid,
      username: usernameClaim,
      role,
      displayName:
        firebaseUser.displayName ||
        targetUser?.displayName ||
        usernameClaim,
      password: '',
      failedAttempts: 0,
      isLocked: false,
      createdAt: targetUser?.createdAt || Date.now(),
    };
    const updatedUsers = users.filter(
      (user) => user.username.toLowerCase() !== username.toLowerCase()
    );
    updatedUsers.push(authenticatedUser);
    this.saveUsers(updatedUsers);
    this.setCurrentSession(authenticatedUser);

    return { success: true, user: authenticatedUser };
  }

  private static recordFailedLogin(
    users: AppUser[],
    userIndex: number
  ): { success: false; error: string; isLocked?: boolean } {
    if (userIndex < 0) {
      return { success: false, error: 'Invalid username or password.' };
    }

    const targetUser = users[userIndex];
    targetUser.failedAttempts = (targetUser.failedAttempts || 0) + 1;
    if (targetUser.failedAttempts >= 5) {
      targetUser.isLocked = true;
      this.saveUsers(users);
      return {
        success: false,
        isLocked: true,
        error:
          'Account locked after 5 failed login attempts. Please contact the system owner to reset your password.',
      };
    }

    this.saveUsers(users);
    const remaining = 5 - targetUser.failedAttempts;
    return {
      success: false,
      error: `Incorrect password. You have ${remaining} attempt${
        remaining === 1 ? '' : 's'
      } remaining before account lock.`,
    };
  }

  static async provisionFirebaseAccount(user: AppUser): Promise<string> {
    const result = await FirebaseUserAdminApi.createUser(user);
    return result.user.id;
  }

  static async updateFirebaseProfile(user: AppUser): Promise<void> {
    await FirebaseUserAdminApi.updateUser(user);
  }

  static async resetFirebasePassword(
    user: AppUser,
    newPassword: string
  ): Promise<void> {
    await FirebaseUserAdminApi.resetPassword(user.id, newPassword);
  }

  static async disableFirebaseAccount(user: AppUser): Promise<void> {
    await FirebaseUserAdminApi.disableUser(user.id);
  }

  static async logout(): Promise<void> {
    this.setCurrentSession(null);
    await signOut(auth);
  }

  // Admin: create new user
  static createUser(
    newUser: Omit<AppUser, 'id' | 'createdAt' | 'failedAttempts' | 'isLocked'>
  ): { success: boolean; error?: string; user?: AppUser } {
    const users = this.getUsers();
    if (
      users.some(
        (u) => u.username.toLowerCase() === newUser.username.trim().toLowerCase()
      )
    ) {
      return { success: false, error: 'Username already exists.' };
    }

    const created: AppUser = {
      id: 'usr_' + Math.random().toString(36).slice(2, 9),
      username: newUser.username.trim(),
      password: newUser.password.trim(),
      role: newUser.role,
      displayName: newUser.displayName.trim() || newUser.username.trim(),
      failedAttempts: 0,
      isLocked: false,
      createdAt: Date.now(),
    };

    users.push(created);
    this.saveUsers(users);
    return { success: true, user: created };
  }

  // Admin: update user (role, password, unlock)
  static updateUser(
    userId: string,
    updates: Partial<Pick<AppUser, 'password' | 'role' | 'displayName' | 'isLocked' | 'failedAttempts'>>
  ): boolean {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return false;

    users[idx] = { ...users[idx], ...updates };
    this.saveUsers(users);

    // Update active session if currently logged in user was modified
    const current = this.getCurrentSession();
    if (current && current.id === userId) {
      this.setCurrentSession(users[idx]);
    }

    return true;
  }

  static replaceUserId(oldId: string, newId: string): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.id === oldId);
    if (idx === -1) return;
    users[idx].id = newId;
    users[idx].password = '';
    this.saveUsers(users);
    const current = this.getCurrentSession();
    if (current?.id === oldId) {
      this.setCurrentSession({ ...current, id: newId, password: '' });
    }
  }

  // Admin: delete user
  static deleteUser(userId: string): boolean {
    const users = this.getUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) return false;

    // Prevent deleting default owner admin
    if (target.username.toLowerCase() === DEFAULT_ADMIN.username.toLowerCase()) {
      return false;
    }

    const filtered = users.filter((u) => u.id !== userId);
    this.saveUsers(filtered);
    return true;
  }

  // Check if current URL indicates View-Only mode
  static isUrlViewOnly(): boolean {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return (
      hash.includes('view-only') ||
      hash.includes('readonly') ||
      search.includes('view=readonly') ||
      search.includes('mode=view')
    );
  }
}
