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
  User,
  AlertCircle,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { authService } from '../services/authService';
import { UserProfile } from '../types';
import { getStoredSupabaseConfig } from '../lib/supabase';
import { DatabaseConfigModal } from '../components/common/DatabaseConfigModal';

interface RegisterProps {
  onRegisterSuccess: (user: UserProfile) => void;
  onNavigateToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({
  onRegisterSuccess,
  onNavigateToLogin,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

    if (!fullName.trim()) {
      setError('Please provide your full name.');
      return;
    }

    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      const user = await authService.signUp(email.trim(), password, fullName.trim());
      onRegisterSuccess(user);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex items-center justify-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-neutral-900">CollabDocs</span>
          </div>
          <h2 className="mt-4 text-center text-xl font-semibold text-neutral-800">
            Create your CollabDocs account
          </h2>
          <p className="mt-1 text-center text-xs text-neutral-500">
            Join your team to write, organize, and share documents
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

          <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-neutral-200/90 rounded-2xl space-y-5">
            {error && (
              <div className="p-3 rounded-lg text-xs bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Ada Lovelace"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Work Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="ada@example.com"
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
                    placeholder="Min 6 characters"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <span>
                  {isLoading
                    ? 'Creating account...'
                    : dbConfig.isConfigured
                    ? 'Register in Supabase'
                    : 'Create Account'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="pt-2 text-center border-t border-neutral-100">
              <p className="text-xs text-neutral-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={onNavigateToLogin}
                  className="font-medium text-blue-600 hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      <DatabaseConfigModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
        onConfigChanged={() => setDbConfig(getStoredSupabaseConfig())}
      />
    </>
  );
};
