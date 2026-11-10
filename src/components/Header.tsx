import React from 'react';
import { User } from 'firebase/auth';
import { AppUser } from '../lib/types';
import {
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Calendar,
  Sparkles,
  Users,
  LogOut,
  ShieldCheck,
  Eye as EyeIcon,
} from 'lucide-react';
import { SyncState } from '../lib/googleSheetsService';

interface HeaderProps {
  currentUser: AppUser | null;
  onAppLogout: () => void;
  onOpenUserManagement: () => void;
  isViewOnly: boolean;
  googleUser: User | null;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  isLoggingIn: boolean;
  costPrivacy: boolean;
  onToggleCostPrivacy: () => void;
  syncState: SyncState;
  onManualSync: () => void;
  onOpenHolidays: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onAppLogout,
  onOpenUserManagement,
  isViewOnly,
  googleUser,
  onGoogleLogin,
  onGoogleLogout,
  isLoggingIn,
  costPrivacy,
  onToggleCostPrivacy,
  syncState,
  onManualSync,
  onOpenHolidays,
}) => {
  const isAdmin = currentUser?.role === 'Admin';

  const isViewer = isViewOnly || currentUser?.role === 'Viewer';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs">
      {/* Viewer Mode Banner (Permanent Cost Restriction) */}
      {isViewer ? (
        <div className="bg-slate-900 text-white px-3 sm:px-4 py-1 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <span className="w-2 h-2 rounded-full bg-[#ccf835]" />
            <span className="text-slate-300">Viewer Mode</span>
            <span className="text-slate-400">·</span>
            <span className="text-[#ccf835] font-bold">Read-Only & Costs Restricted</span>
          </div>
        </div>
      ) : costPrivacy ? (
        /* Presentation Mode Warning Ribbon when active for Editor/Admin */
        <div className="bg-slate-900 text-white px-3 sm:px-4 py-1 text-xs font-semibold flex items-center justify-between transition-all shadow-xs">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <span className="px-2 py-0.5 rounded-md bg-[#ccf835] text-slate-950 font-extrabold text-[10px] tracking-wide uppercase">
              Presentation Mode
            </span>
            <span className="text-slate-300">Unit costs & budgets are hidden</span>
          </div>
          <button
            onClick={onToggleCostPrivacy}
            className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-[#ccf835] hover:text-white cursor-pointer ml-4"
          >
            Show Costs
          </button>
        </div>
      ) : null}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">
          {/* Brand - Project Tracker (Niond Style) */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <a
              href="#all"
              className="flex items-center gap-2.5 sm:gap-3 text-slate-900 group flex-shrink-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl overflow-hidden flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform flex-shrink-0 bg-white border border-slate-200 p-0.5">
                <img
                  src="/assets/aistudio/image_5173417e.png"
                  alt="Project Tracker Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 group-hover:text-slate-700 transition-colors font-heading truncate">
                Project Tracker
              </h1>
            </a>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Cost Privacy Toggle Button */}
            {!isViewer && (
              <button
                onClick={onToggleCostPrivacy}
                title={costPrivacy ? 'Show Costs' : 'Hide Costs'}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  costPrivacy
                    ? 'bg-[#f4fae1] border-[#ccf835] text-slate-900 shadow-2xs ring-2 ring-[#ccf835]/40'
                    : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700'
                }`}
              >
                {costPrivacy ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-800" />
                    <span className="hidden md:inline text-slate-600">Cost View:</span>
                    <span className="font-extrabold text-slate-950 text-[11px] sm:text-xs">Hidden</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden md:inline text-slate-500">Cost View:</span>
                    <span className="text-slate-700 font-semibold text-[11px] sm:text-xs">Visible</span>
                  </>
                )}
              </button>
            )}

            {/* Holidays Configuration Button */}
            <button
              onClick={onOpenHolidays}
              title="Configure Holidays & Non-Working Days"
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200/80 transition-colors border border-slate-200 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Holidays</span>
            </button>

            {/* Admin User Management Button */}
            {isAdmin && (
              <button
                onClick={onOpenUserManagement}
                title="Manage Users, Roles & Passwords"
                className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-slate-900 bg-[#ccf835]/30 hover:bg-[#ccf835]/60 border border-[#ccf835] transition-colors cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-slate-900" />
                <span className="hidden md:inline">Users & Roles</span>
              </button>
            )}

            {/* Google Sheets Sync (Only for Admin to sync database) */}
            {isAdmin && (
              <>
                {googleUser ? (
                  <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-xl p-1 text-xs">
                    <button
                      onClick={onManualSync}
                      disabled={syncState.isSyncing}
                      title="Sync with Google Sheets database"
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-emerald-900 hover:bg-emerald-100/70 transition-colors cursor-pointer disabled:opacity-50 font-semibold text-[11px]"
                    >
                      <RefreshCw
                        className={`w-3 h-3 text-emerald-600 ${
                          syncState.isSyncing ? 'animate-spin' : ''
                        }`}
                      />
                      <span className="hidden md:inline">
                        {syncState.isSyncing ? 'Syncing...' : 'Sheets'}
                      </span>
                    </button>

                    {syncState.spreadsheetUrl && (
                      <a
                        href={syncState.spreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in Google Sheets"
                        className="p-1 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-white/80 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  /* Compact Google Connection button as requested */
                  <button
                    onClick={onGoogleLogin}
                    disabled={isLoggingIn}
                    title="Connect Google account for Google Sheets sync"
                    className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span className="hidden sm:inline">
                      {isLoggingIn ? '...' : 'Connect Sheets'}
                    </span>
                  </button>
                )}
              </>
            )}

            {/* Logged in User Profile & Sign Out */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div
                  className="w-8 h-8 rounded-full bg-slate-900 text-[#ccf835] flex items-center justify-center text-xs font-black shadow-xs"
                  title={`${currentUser.username} (${currentUser.role})`}
                >
                  {currentUser.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden lg:block text-left text-xs leading-tight">
                  <span className="font-bold text-slate-900 block truncate max-w-[100px]">
                    {currentUser.username}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={onAppLogout}
                  title="Sign out of system"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
