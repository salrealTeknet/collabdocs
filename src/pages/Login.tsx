/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  UserPlus,
  BookOpen,
  Database,
} from 'lucide-react';
import { authService } from '../services/authService';
import { UserProfile } from '../types';
import { getStoredSupabaseConfig } from '../lib/supabase';
import { SetupGuideModal } from '../components/common/SetupGuideModal';
import { DatabaseConfigModal } from '../components/common/DatabaseConfigModal';

interface LoginProps {
  onLoginSuccess: (user: UserProfile) => void;
  onNavigateToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess, onNavigateToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);
  const [dbConfig, setDbConfig] = useState(getStoredSupabaseConfig());

  useEffect(() => {
    const handleConfigChange = () => {
      setDbConfig(getStoredSupabaseConfig());
    };
    window.addEventListener('collabdocs_supabase_config_changed', handleConfigChange);
    return () => {
      window.removeEventListener('collabdocs_supabase_config_changed', handleConfigChange);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both your email address and password.');
      return;
    }

    try {
      setIsLoading(true);
      const user = await authService.signIn(email.trim(), password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Brand */}
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-neutral-900">CollabDocs</span>
          </div>
          <h2 className="mt-4 text-center text-xl font-semibold text-neutral-800">
            Sign in to your workspace
          </h2>
          <p className="mt-1 text-center text-xs text-neutral-500">
            Collaborative document management and rich-text editing
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          {/* Supabase backend status banner */}
          <div
            onClick={() => setIsDbModalOpen(true)}
            className={`cursor-pointer mb-3 px-3.5 py-2 rounded-xl text-xs flex items-center justify-between border transition-colors ${
              dbConfig.isConfigured
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100/70'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Database
                className={`w-3.5 h-3.5 shrink-0 ${
                  dbConfig.isConfigured ? 'text-emerald-600' : 'text-amber-600'
                }`}
              />
              <span className="truncate">
                {dbConfig.isConfigured ? (
                  <>
                    Target Database: <strong className="font-semibold">Supabase Connected</strong>
                  </>
                ) : (
                  <>
                    Target Database: <strong className="font-semibold">Local Storage</strong> (Click to connect Supabase)
                  </>
                )}
              </span>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                dbConfig.isConfigured
                  ? 'bg-emerald-200/80 text-emerald-900'
                  : 'bg-amber-200/80 text-amber-900'
              }`}
            >
              {dbConfig.isConfigured ? 'Live' : 'Configure'}
            </span>
          </div>

          <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-neutral-200/90 rounded-2xl space-y-6">
            {error && (
              <div className="p-3 rounded-lg text-xs bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="pt-4 border-t border-neutral-100 flex flex-col items-center gap-2.5">
              <p className="text-xs text-neutral-500">
                Don&apos;t have an account yet?
              </p>
              <button
                type="button"
                onClick={onNavigateToRegister}
                className="w-full py-2 px-3 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5 text-neutral-500" />
                <span>Create an Account</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1.5 mt-1 underline decoration-dotted"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                <span>How to set up & run this app</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <SetupGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      <DatabaseConfigModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onConfigChanged={() => setDbConfig(getStoredSupabaseConfig())}
      />
    </>
  );
};
