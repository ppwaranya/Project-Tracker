import { auth } from './auth';
import { AppUser } from './types';

type AdminAction =
  | 'bootstrapAdmin'
  | 'syncAccounts'
  | 'createUser'
  | 'updateUser'
  | 'resetPassword'
  | 'disableUser'
  | 'enableUser';

const sendAdminAction = async <T>(
  action: AdminAction,
  payload: Record<string, unknown> = {}
): Promise<T> => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Sign in to Firebase before managing user accounts.');
  }

  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(result.error || 'Firebase user operation failed.');
  }
  return result;
};

export const FirebaseUserAdminApi = {
  bootstrapAdmin: (user: Pick<AppUser, 'username' | 'password' | 'displayName'>) =>
    sendAdminAction<{ user: AppUser }>('bootstrapAdmin', { user }),
  syncAccounts: (users: AppUser[]) =>
    sendAdminAction<{ users: AppUser[] }>('syncAccounts', { users }),
  createUser: (user: AppUser) =>
    sendAdminAction<{ user: AppUser }>('createUser', { user }),
  updateUser: (user: Pick<AppUser, 'id' | 'username' | 'role' | 'displayName'>) =>
    sendAdminAction<{ user: AppUser }>('updateUser', { user }),
  resetPassword: (id: string, password: string) =>
    sendAdminAction<{ ok: boolean }>('resetPassword', {
      user: { id, password },
    }),
  disableUser: (id: string) =>
    sendAdminAction<{ ok: boolean }>('disableUser', { user: { id } }),
  enableUser: (id: string) =>
    sendAdminAction<{ ok: boolean }>('enableUser', { user: { id } }),
  refreshClaims: async () => {
    await auth.currentUser?.getIdToken(true);
  },
};
