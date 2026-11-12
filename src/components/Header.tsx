import React, { useEffect, useRef, useState } from 'react';
import { AppUser } from '../lib/types';
import {
  Eye,
  EyeOff,
  RefreshCw,
  Calendar,
  Users,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { SyncState } from '../lib/googleSheetsService';

interface HeaderProps {
  currentUser: AppUser | null;
  onAppLogout: () => void;
  onOpenUserManagement: () => void;
  isViewOnly: boolean;
  isSharedProjectView: boolean;
  costPrivacy: boolean;
  onToggleCostPrivacy: () => void;
  syncState: SyncState;
  onForceSync: () => void;
  onOpenHolidays: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onAppLogout,
  onOpenUserManagement,
  isViewOnly,
  isSharedProjectView,
  costPrivacy,
  onToggleCostPrivacy,
  syncState,
  onForceSync,
  onOpenHolidays,
}) => {
  const isAdmin = currentUser?.role === 'Admin';
  const isViewer = isViewOnly || currentUser?.role === 'Viewer';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMenuOpen]);

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
          {/* Brand - Project Tracker */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {isSharedProjectView ? (
              <div className="flex items-center gap-2.5 sm:gap-3 text-slate-900 flex-shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl overflow-hidden flex items-center justify-center shadow-xs flex-shrink-0 bg-white border border-slate-200 p-0.5">
                  <img
                    src="/assets/aistudio/image_5173417e.png"
                    alt="Project Tracker Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 font-heading truncate">
                  Project Tracker
                </h1>
              </div>
            ) : (
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
            )}
          </div>

          <div className="relative flex-shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-haspopup="menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ccf835] cursor-pointer"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {isMenuOpen && (
              <div
                role="menu"
                aria-label="Main menu"
                className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
              >
                {currentUser && (
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {currentUser.displayName || currentUser.username}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {currentUser.role}
                    </p>
                  </div>
                )}

                {!isViewer && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      onToggleCostPrivacy();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    {costPrivacy ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    Cost View: {costPrivacy ? 'Hidden' : 'Visible'}
                  </button>
                )}

                <button
                  role="menuitem"
                  onClick={() => {
                    onOpenHolidays();
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <Calendar className="h-4 w-4" />
                  Holidays
                </button>

                {isAdmin && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      onOpenUserManagement();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    <Users className="h-4 w-4" />
                    Users &amp; Roles
                  </button>
                )}

                {/* ส่วนสถานะซิงก์และปุ่ม Force Sync ย้ายมาไว้ในเมนูแฮมเบอร์เกอร์ */}
                <div className="my-1 border-t border-slate-100" />
                <div className="px-3 py-2 space-y-2 bg-slate-50/80 rounded-xl">
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span
                      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                        syncState.isSyncing
                          ? 'bg-amber-400 animate-pulse'
                          : syncState.isSynced
                          ? 'bg-emerald-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span className="truncate font-medium">
                      {syncState.isSyncing
                        ? 'กำลังซิงก์ข้อมูลกับ Google Sheets...'
                        : syncState.lastSyncedAt
                        ? `ซิงก์ล่าสุด: ${new Date(syncState.lastSyncedAt).toLocaleTimeString('th-TH')}`
                        : 'พร้อมใช้งาน'}
                    </span>
                  </div>

                  {!isViewer && (
                    <button
                      role="menuitem"
                      type="button"
                      disabled={syncState.isSyncing}
                      onClick={() => {
                        onForceSync();
                        setIsMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw
                        className={`h-3.5 w-3.5 ${syncState.isSyncing ? 'animate-spin' : ''}`}
                      />
                      <span>Force Sync (ดันขึ้นชีตทันที)</span>
                    </button>
                  )}
                </div>

                <div className="my-1 border-t border-slate-100" />

                {currentUser && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      onAppLogout();
                      setIsMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out of Project Tracker
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};