/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Key, ShieldCheck } from 'lucide-react';
import { Modal } from './Modal';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearCustomSupabaseConfig,
  testSupabaseConnection,
} from '../../lib/supabase';
import { localDB } from '../../lib/localDatabase';

interface DatabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const DatabaseConfigModal: React.FC<DatabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const currentConfig = getStoredSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [anonKey, setAnonKey] = useState(currentConfig.anonKey);
  const [forceLocal, setForceLocal] = useState(currentConfig.forceLocal);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setStatusMsg(null);

    if (forceLocal) {
      saveSupabaseConfig(url, anonKey, true);
      setStatusMsg({ type: 'success', text: 'Switched to Local Test Database mode.' });
      setIsTesting(false);
      onConfigChanged();
      setTimeout(onClose, 800);
      return;
    }

    if (!url || !anonKey) {
      setStatusMsg({ type: 'error', text: 'Both Supabase URL and Anon Key are required.' });
      setIsTesting(false);
      return;
    }

    try {
      const testResult = await testSupabaseConnection(url, anonKey);
      if (!testResult.success) {
        throw new Error(testResult.error || 'Failed to connect to Supabase.');
      }

      saveSupabaseConfig(url.trim(), anonKey.trim(), false);
      setStatusMsg({
        type: 'success',
        text: 'Connected to Supabase! Accounts and documents will now save directly to your remote database.',
      });
      onConfigChanged();
      setTimeout(onClose, 1000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Invalid Supabase credentials.' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearAllLocalData = () => {
    localDB.resetToDefaults();
    setStatusMsg({ type: 'success', text: 'All local data cleared. Database is empty.' });
    onConfigChanged();
  };

  const handleClear = () => {
    clearCustomSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setForceLocal(true);
    setStatusMsg({ type: 'success', text: 'Custom credentials cleared. Using local database.' });
    onConfigChanged();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Database & Infrastructure Settings"
      description="Configure Supabase PostgreSQL connection or switch to Local Test Database"
      maxWidth="lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {statusMsg && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Current status overview */}
        <div className="bg-neutral-50 rounded-lg p-3.5 border border-neutral-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                currentConfig.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
              }`}
            />
            <div>
              <div className="text-xs font-semibold text-neutral-800">
                {currentConfig.isConfigured ? 'Live Supabase Connected' : 'Local Test DB Mode (Zero-Config Active)'}
              </div>
              <div className="text-[11px] text-neutral-500">
                {currentConfig.isConfigured
                  ? 'Authenticated requests query your remote PostgreSQL instance with RLS.'
                  : 'Full PostgreSQL schema & RLS simulation active in persistent browser storage.'}
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-neutral-200 text-neutral-600">
            {currentConfig.isConfigured ? 'Remote' : 'Local'}
          </span>
        </div>

        {/* Mode Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-neutral-700">Storage Backend</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForceLocal(false)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                !forceLocal
                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-600'
                  : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
              }`}
            >
              <div className="text-xs font-medium flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-600" />
                Live Supabase
              </div>
              <p className="text-[10px] text-neutral-500 mt-0.5">Use remote PostgreSQL & Auth</p>
            </button>
            <button
              type="button"
              onClick={() => setForceLocal(true)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                forceLocal
                  ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-600'
                  : 'border-neutral-200 hover:border-neutral-300 text-neutral-700'
              }`}
            >
              <div className="text-xs font-medium flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Local Test DB
              </div>
              <p className="text-[10px] text-neutral-500 mt-0.5">Instant zero-config evaluator mode</p>
            </button>
          </div>
        </div>

        {!forceLocal && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                placeholder="https://xyzcompany.supabase.co"
                value={url}
                onChange={e => setUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1 flex items-center justify-between">
                <span>Supabase Anon Public Key</span>
                <span className="text-[10px] text-neutral-400">Safe for browser</span>
              </label>
              <div className="relative">
                <Key className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400" />
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={e => setAnonKey(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearAllLocalData}
              className="text-xs text-neutral-600 hover:text-neutral-900 py-1.5 px-2.5 rounded hover:bg-neutral-100 flex items-center gap-1.5 transition-colors"
              title="Clears all stored local profiles, documents, and shares"
            >
              <RefreshCw className="w-3 h-3 text-neutral-500" />
              Clear Local Data
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-neutral-400 hover:text-neutral-600 py-1.5 px-2 transition-colors"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-800 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isTesting}
              className="px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {isTesting ? 'Validating...' : 'Apply & Save'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
