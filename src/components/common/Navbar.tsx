/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  LogOut,
  ChevronDown,
  BookOpen,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { authService } from '../../services/authService';
import { SetupGuideModal } from './SetupGuideModal';

interface NavbarProps {
  currentUser: UserProfile | null;
  onUserChanged: (user: UserProfile | null) => void;
  onRefreshDocs?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onUserChanged,
}) => {
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await authService.signOut();
    onUserChanged(null);
  };

  const initials = currentUser?.full_name
    ? currentUser.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <>
      <header className="h-14 border-b border-neutral-200 bg-white/95 backdrop-blur-xs sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="flex items-center gap-2.5 text-neutral-900 font-semibold tracking-tight hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-base font-bold bg-gradient-to-r from-neutral-900 to-neutral-700 bg-clip-text text-transparent">
              CollabDocs
            </span>
          </a>
          <span className="hidden sm:inline-block text-[11px] font-medium text-neutral-400 border-l border-neutral-200 pl-3">
            Collaborative Document Workspace
          </span>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Setup Guide button */}
          <button
            onClick={() => setIsGuideModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            title="View Setup & Run Guide"
          >
            <BookOpen className="w-3 h-3 text-neutral-500" />
            <span className="hidden md:inline">Setup Guide</span>
          </button>

          {currentUser ? (
            <div className="relative">
              {/* User profile button */}
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-neutral-100 border border-transparent hover:border-neutral-200 transition-colors"
                aria-expanded={isUserMenuOpen}
              >
                <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-semibold">
                  {initials}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-medium text-neutral-800 leading-tight">
                    {currentUser.full_name}
                  </div>
                  <div className="text-[10px] text-neutral-400 leading-tight truncate max-w-[140px]">
                    {currentUser.email}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {/* User Dropdown */}
              {isUserMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-lg border border-neutral-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-2 border-b border-neutral-100">
                      <div className="text-xs font-semibold text-neutral-800">
                        {currentUser.full_name}
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate">
                        {currentUser.email}
                      </div>
                    </div>

                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-xs text-neutral-500">Not authenticated</div>
          )}
        </div>
      </header>

      <SetupGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </>
  );
};
