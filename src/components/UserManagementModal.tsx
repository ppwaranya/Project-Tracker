import React, { useState } from 'react';
import { AppUser, UserRole } from '../lib/types';
import { UserAuthService } from '../lib/userAuthService';
import {
  X,
  UserPlus,
  Unlock,
  Trash2,
  Check,
  Copy,
  Users,
  ShieldAlert,
} from 'lucide-react';

interface UserManagementModalProps {
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  onClose,
}) => {
  const [users, setUsers] = useState<AppUser[]>(UserAuthService.getUsers());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('Editor');
  const [formError, setFormError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSyncingAccounts, setIsSyncingAccounts] = useState(false);
  const [hasSyncedAccounts, setHasSyncedAccounts] = useState(() =>
    UserAuthService.getUsers().some(
      (user) =>
        !user.id.startsWith('usr_') && !user.id.startsWith('user_')
    )
  );

  // Reset password state for existing user
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  const refreshUsers = () => {
    setUsers(UserAuthService.getUsers());
  };

  const handleSyncAccounts = async () => {
    setIsSyncingAccounts(true);
    setFormError('');
    try {
      const syncedUsers = await UserAuthService.syncAccounts();
      setUsers(syncedUsers);
      setHasSyncedAccounts(true);
      setFormError('Accounts were synced to Firebase successfully.');
    } catch (error) {
      console.error('Could not sync legacy accounts:', error);
      setFormError(
        error instanceof Error ? error.message : 'Account sync failed.'
      );
    } finally {
      setIsSyncingAccounts(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newUsername.trim() || !newPassword.trim()) {
      setFormError('Please provide both username and password.');
      return;
    }
    if (!hasSyncedAccounts) {
      setFormError('Sync accounts with Firebase before managing users.');
      return;
    }
    if (newPassword.length < 6) {
      setFormError('Firebase passwords must be at least 6 characters.');
      return;
    }

    try {
      const user = await UserAuthService.createFirebaseUser({
        username: newUsername.trim(),
        password: newPassword,
        displayName: newDisplayName.trim() || newUsername.trim(),
        role: newRole,
      });
      setUsers((current) => [...current, user]);
      setNewUsername('');
      setNewPassword('');
      setNewDisplayName('');
      setNewRole('Editor');
      setShowAddForm(false);
    } catch (error) {
      console.error('Could not create Firebase account:', error);
      setFormError(
        error instanceof Error ? error.message : 'Failed to create user.'
      );
    }
  };

  const handleUnlockUser = async (user: AppUser) => {
    try {
      await UserAuthService.setFirebaseUserDisabled(user.id, false);
      refreshUsers();
    } catch (error) {
      console.error('Could not unlock Firebase account:', error);
      setFormError(error instanceof Error ? error.message : 'Could not unlock account.');
    }
  };

  const handleRoleChange = async (user: AppUser, role: UserRole) => {
    try {
      const updated = await UserAuthService.updateFirebaseUser({
        ...user,
        role,
      });
      setUsers((current) =>
        current.map((item) => (item.id === updated.id ? updated : item))
      );
    } catch (error) {
      console.error('Could not update Firebase account role:', error);
      setFormError(error instanceof Error ? error.message : 'Could not update role.');
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (resetPasswordVal.length < 6) {
      setFormError('Firebase passwords must be at least 6 characters.');
      return;
    }
    try {
      await UserAuthService.resetFirebasePassword(userId, resetPasswordVal);
      await UserAuthService.setFirebaseUserDisabled(userId, false);
      setUsers((current) =>
        current.map((user) =>
          user.id === userId ? { ...user, isLocked: false } : user
        )
      );
      setEditingUserId(null);
      setResetPasswordVal('');
      setFormError('');
    } catch (error) {
      console.error('Could not reset Firebase account password:', error);
      setFormError(
        error instanceof Error ? error.message : 'Could not reset password.'
      );
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await UserAuthService.setFirebaseUserDisabled(userId, true);
        refreshUsers();
      } catch (error) {
        console.error('Could not disable Firebase account:', error);
        setFormError(
          error instanceof Error ? error.message : 'Could not disable account.'
        );
      }
    }
  };

  const handleCopyViewOnlyLink = () => {
    const url = new URL(window.location.href);
    url.hash = '#view-only';
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold">
              <Users className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading">
                User Management & Roles
              </h3>
              <p className="text-xs text-slate-500">
                Manage system credentials, user access roles, and unlocked accounts
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View-Only Share Link Banner */}
        <div className="my-4 p-3.5 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-teal-950 block">
              Shareable View-Only Link (ลิงก์สำหรับดูอย่างเดียว)
            </span>
            <span className="text-[11px] text-teal-700">
              Recipients can inspect projects and timelines without editing or deleting privileges
            </span>
          </div>

          <button
            onClick={handleCopyViewOnlyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
        </div>

        {/* Content list */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          {/* Add User Button & Form */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700">
              Active Users ({users.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncAccounts}
                disabled={isSyncingAccounts}
                className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {isSyncingAccounts ? 'Syncing...' : 'Sync Accounts'}
              </button>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                disabled={!hasSyncedAccounts}
                className="flex items-center gap-1 text-xs font-extrabold px-3 py-1.5 rounded-xl bg-[#ccf835] hover:bg-[#bced28] text-slate-950 transition-colors cursor-pointer shadow-2xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Cancel' : 'Add User'}</span>
              </button>
            </div>
          </div>

          {!hasSyncedAccounts && (
            <p className="text-xs text-slate-500">
              Sync accounts once to move existing usernames into Firebase before
              adding or managing accounts.
            </p>
          )}

          {formError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {formError}
            </div>
          )}

          {showAddForm && (
            <form
              onSubmit={handleAddUser}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-100"
            >
              <h4 className="text-xs font-bold text-slate-800">New User Credentials</h4>
              {formError && (
                <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder=""
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder=""
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-400 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder=""
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Access Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-amber-400 cursor-pointer"
                  >
                    <option value="Admin">Admin (Full Control)</option>
                    <option value="Editor">Editor (Edit & Create)</option>
                    <option value="Viewer">Viewer (View-Only)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-extrabold text-slate-950 bg-[#ccf835] hover:bg-[#bced28] rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Create User
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs text-left min-w-[560px]">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3.5">User</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isDefaultAdmin = u.username.toLowerCase() === 'waranyac';
                  const isEditingThis = editingUserId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{u.username}</span>
                          {isDefaultAdmin && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 font-extrabold">
                              Owner
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {u.displayName || '-'}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {isDefaultAdmin ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                            Admin
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            disabled={!hasSyncedAccounts}
                            onChange={(e) =>
                              handleRoleChange(u, e.target.value as UserRole)
                            }
                            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 font-bold bg-white text-slate-700 cursor-pointer"
                          >
                            <option value="Admin">Admin</option>
                            <option value="Editor">Editor</option>
                            <option value="Viewer">Viewer</option>
                          </select>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {u.isLocked ? (
                          <div className="flex items-center gap-1 text-rose-700 font-bold bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg w-max text-[11px]">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            <span>Disabled</span>
                          </div>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {u.isLocked && (
                            <button
                              onClick={() => handleUnlockUser(u)}
                              disabled={!hasSyncedAccounts}
                              className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 transition-colors"
                              title="Unlock account"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Unlock</span>
                            </button>
                          )}

                          {isEditingThis ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="password"
                                value={resetPasswordVal}
                                onChange={(e) => setResetPasswordVal(e.target.value)}
                                placeholder=""
                                className="w-24 text-[11px] px-2 py-1 rounded-lg border border-slate-300 bg-white"
                              />
                              <button
                                onClick={() => handleResetPassword(u.id)}
                                className="text-[11px] font-bold px-2 py-1 rounded-lg bg-emerald-600 text-white"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUserId(null);
                                  setResetPasswordVal('');
                                }}
                                className="text-[11px] p-1 text-slate-400 hover:text-slate-600"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingUserId(u.id);
                                setResetPasswordVal('');
                              }}
                              disabled={!hasSyncedAccounts}
                              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Reset password"
                            >
                              Reset Pass
                            </button>
                          )}

                          {!isDefaultAdmin && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              disabled={!hasSyncedAccounts}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
