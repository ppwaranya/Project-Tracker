import React, { useState } from 'react';
import { UserAuthService } from '../lib/userAuthService';
import { AppUser } from '../lib/types';
import { Lock, User, Eye, EyeOff, ShieldAlert, Sparkles, KeyRound } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: AppUser) => void;
  onBootstrapAdmin: (username: string, password: string) => Promise<void>;
  onEnterViewOnly: () => void;
  isViewOnlyModeAvailable?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onBootstrapAdmin,
  onEnterViewOnly,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleBootstrapAdmin = async () => {
    setErrorMsg('');
    if (!username.trim() || !password) {
      setErrorMsg('Enter the admin username and a password of at least 6 characters.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('The admin password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await onBootstrapAdmin(username.trim(), password);
    } catch (error) {
      console.error('Admin account setup failed:', error);
      setErrorMsg(
        error instanceof Error ? error.message : 'Admin account setup failed.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const result = await UserAuthService.login(username, password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMsg(result.error || 'Authentication failed');
        if (result.isLocked) {
          setIsLocked(true);
        }
      }
    } catch (error) {
      console.error('Username and password sign-in failed:', error);
      setErrorMsg(
        'Could not connect to Firebase. Check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl overflow-hidden flex items-center justify-center mx-auto shadow-md shadow-teal-900/10 bg-white border border-slate-200 p-1.5">
            <img
              src="/assets/aistudio/image_5173417e.png"
              alt="Project Tracker Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-heading">
            Project Tracker
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Sign in with your username and password to continue
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-7 sm:p-8 shadow-xs space-y-5">
          {errorMsg && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-3 ${
                isLocked
                  ? 'bg-rose-50 border-rose-300 text-rose-900'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">
                  {isLocked ? 'Account Locked' : 'Authentication Error'}
                </span>
                <p className="leading-relaxed">{errorMsg}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  autoFocus
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder=""
                  className="w-full text-sm pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#ccf835] bg-slate-50/50 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  className="w-full text-sm pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-[#ccf835] bg-slate-50/50 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full py-2.5 px-4 rounded-xl text-sm font-extrabold text-slate-950 bg-[#ccf835] hover:bg-[#bced28] transition-all cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-slate-900" />
              <span>{loading ? 'Verifying...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-xs leading-relaxed text-slate-500">
              First-time setup or recovery: enter the admin username and a new
              password, then verify with the designated Google account.
            </p>
            <button
              type="button"
              onClick={handleBootstrapAdmin}
              disabled={loading}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? 'Setting up admin...' : 'Set up admin with Google'}
            </button>
          </div>
        </div>

        {/* View-Only Mode Access Option */}
        <div className="text-center">
          <button
            type="button"
            onClick={onEnterViewOnly}
            className="text-xs font-semibold text-slate-500 hover:text-teal-700 underline cursor-pointer"
          >
            Access in View-Only Mode (Read-Only)
          </button>
        </div>
      </div>
    </div>
  );
};
