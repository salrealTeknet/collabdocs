/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Database,
  Check,
  Copy,
  ExternalLink,
  AlertTriangle,
  Terminal,
} from 'lucide-react';
import { Modal } from './Modal';
import { INITIAL_SCHEMA_SQL } from '../../lib/migrationSql';

interface SqlMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlMigrationModal: React.FC<SqlMigrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(INITIAL_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase Database Schema Setup"
      description="Run this SQL script in your Supabase project to create required tables and security rules"
      maxWidth="lg"
    >
      <div className="space-y-4 text-xs text-neutral-600">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">
              Why did &quot;public.documents not found in schema cache&quot; happen?
            </p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Your Supabase project is connected, but the PostgreSQL database tables (
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-medium">documents</code>,{' '}
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-medium">profiles</code>,{' '}
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-medium">document_shares</code>
              ) and Row Level Security policies have not been created yet.
            </p>
          </div>
        </div>

        {/* 3 Steps */}
        <div className="border border-neutral-200 rounded-xl p-3.5 bg-neutral-50/70 space-y-2">
          <h4 className="font-semibold text-neutral-900 flex items-center gap-1.5 text-xs">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            3-Step Quick Fix (Takes 30 seconds):
          </h4>
          <ol className="list-decimal pl-5 space-y-1.5 text-[11px] text-neutral-700">
            <li>
              Copy the SQL migration script below.
            </li>
            <li>
              Open your{' '}
              <a
                href="https://supabase.com/dashboard/project/_/sql"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 font-medium hover:underline inline-flex items-center gap-0.5"
              >
                <span>Supabase SQL Editor</span>
                <ExternalLink className="w-3 h-3" />
              </a>{' '}
              and click <strong>&quot;New Query&quot;</strong>.
            </li>
            <li>
              Paste the SQL and click <strong>&quot;Run&quot;</strong>. That&apos;s it! All tables, indexes, and RLS policies are created immediately.
            </li>
          </ol>
        </div>

        {/* Copy Button & Code preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-neutral-800 text-[11px] flex items-center gap-1">
              <Terminal className="w-3 h-3 text-neutral-500" />
              SQL Migration (supabase/migrations/20240101000000_initial_schema.sql)
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="py-1 px-3 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL Script</span>
                </>
              )}
            </button>
          </div>

          <pre className="bg-neutral-900 text-neutral-200 p-3 rounded-xl font-mono text-[10px] leading-relaxed max-h-56 overflow-y-auto border border-neutral-800 select-all">
            {INITIAL_SCHEMA_SQL}
          </pre>
        </div>

        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
          <a
            href="https://supabase.com/dashboard/project/_/sql"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <span>Open Supabase SQL Editor</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 border border-neutral-300 rounded-lg transition-colors cursor-pointer"
          >
            Done / Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
