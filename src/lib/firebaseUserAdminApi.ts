import { auth } from './auth';
import { AppUser, UserRole } from './types';

type AdminAction =
  | 'bootstrapAdmin'
  | 'syncAccounts'
  | 'listUsers'
  | 'createUser'
  | 'updateUser'
  | 'resetPassword'
  | 'disableUser'
  | 'enableUser';

const request = async <T>(
  action: AdminAction,
  payload: Record<string, unknown> = {},
  setupSecret?: string
): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (setupSecret === undefined) {
    if (!auth.currentUser) {
      throw new Error('Sign in with your username and password first.');
    }
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }

  const response = await fetch('/api/users', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload, ...(setupSecret !== undefined ? { setupSecret } : {}) }),
  });
  const raw = await response.text();
  let result: (T & { error?: string }) | null = null;
  try {
    result = JSON.parse(raw) as T & { error?: string };
  } catch {
    throw new Error(
      `The account service returned an unexpected response (${response.status}). Check the latest Vercel Runtime Logs.`
    );
  }
  if (!response.ok) {
    throw new Error(result?.error || 'Firebase user operation failed.');
  }
  return result as T;
};

export const FirebaseUserAdminApi = {
  bootstrapAdmin: (
    username: string,
    password: string,
    setupSecret: string,
    displayName: string
  ) =>
    request<{ customToken: string }>(
      'bootstrapAdmin',
      { user: { username, password, role: 'Admin', displayName } },
      setupSecret
    ),
  listUsers: () => request<{ users: AppUser[] }>('listUsers'),
  syncAccounts: (users: AppUser[]) =>
    request<{ users: AppUser[] }>('syncAccounts', { users }),
  createUser: (user: Omit<AppUser, 'id' | 'createdAt' | 'failedAttempts' | 'isLocked'>) =>
    request<{ user: AppUser }>('createUser', { user }),
  updateUser: (user: Pick<AppUser, 'id' | 'username' | 'role' | 'displayName'>) =>
    request<{ user: AppUser }>('updateUser', { user }),
  resetPassword: (id: string, password: string) =>
    request<{ ok: boolean }>('resetPassword', { user: { id, password } }),
  setDisabled: (id: string, disabled: boolean) =>
    request<{ ok: boolean }>(disabled ? 'disableUser' : 'enableUser', {
      user: { id },
    }),
  refreshClaims: async () => {
    await auth.currentUser?.getIdToken(true);
  },
};

export const isValidRole = (role: unknown): role is UserRole =>
  role === 'Admin' || role === 'Editor' || role === 'Viewer';
