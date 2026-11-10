/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Terminal,
  Database,
  Check,
  Copy,
  BookOpen,
  Play,
  CheckCircle2,
  FileCode,
} from 'lucide-react';
import { Modal } from './Modal';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const quickStartCmds = `git clone https://github.com/your-username/collabdocs.git
cd collabdocs
npm install
npm run dev`;

  const envTemplate = `VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="How to Set Up & Run CollabDocs"
      description="Quick start instructions for running locally, connecting Supabase, and testing"
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs text-neutral-600">
        {/* Step 1: Local Development */}
        <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/70">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-neutral-900 flex items-center gap-1.5 text-xs">
              <Play className="w-3.5 h-3.5 text-blue-600" />
              1. Run Locally (Zero-Config Mode)
            </h4>
            <button
              onClick={() => copyToClipboard(quickStartCmds, 'quickstart')}
              className="text-[11px] text-neutral-500 hover:text-neutral-800 flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-neutral-200"
            >
              {copiedSection === 'quickstart' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-neutral-500 mb-2">
            No API keys needed. The app automatically runs with full local RLS storage.
          </p>
          <pre className="bg-neutral-900 text-neutral-100 p-2.5 rounded-lg font-mono text-[11px] overflow-x-auto">
            {quickStartCmds}
          </pre>
        </div>

        {/* Step 2: Live Supabase Setup */}
        <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/70">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-neutral-900 flex items-center gap-1.5 text-xs">
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              2. Connect Live Supabase PostgreSQL (Optional)
            </h4>
            <button
              onClick={() => copyToClipboard(envTemplate, 'env')}
              className="text-[11px] text-neutral-500 hover:text-neutral-800 flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-neutral-200"
            >
              {copiedSection === 'env' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy .env</span>
                </>
              )}
            </button>
          </div>
          <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-neutral-600 mb-2">
            <li>
              Create a free project at{' '}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                supabase.com
              </a>
              .
            </li>
            <li>
              Run the SQL migration located at{' '}
              <code className="bg-neutral-200/80 px-1 py-0.5 rounded font-mono text-[10px]">
                supabase/migrations/20240101000000_initial_schema.sql
              </code>{' '}
              in your Supabase SQL Editor.
            </li>
            <li>
              Add your Supabase URL and Anon Key to <code className="bg-neutral-200/80 px-1 py-0.5 rounded font-mono text-[10px]">.env</code> as <code className="bg-neutral-200/80 px-1 py-0.5 rounded font-mono text-[10px]">VITE_SUPABASE_URL</code> and <code className="bg-neutral-200/80 px-1 py-0.5 rounded font-mono text-[10px]">VITE_SUPABASE_ANON_KEY</code>.
            </li>
          </ol>
        </div>

        {/* Step 3: Automated Testing & Verification */}
        <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/70">
          <h4 className="font-semibold text-neutral-900 flex items-center gap-1.5 text-xs mb-2">
            <Terminal className="w-3.5 h-3.5 text-indigo-600" />
            3. Automated Testing & Verification
          </h4>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-white p-2 rounded-lg border border-neutral-200">
              <span className="font-mono text-neutral-800 font-medium block">npm test</span>
              <span className="text-neutral-500 text-[10px]">
                Runs 13 Vitest integration tests (auth, CRUD, sharing, file import)
              </span>
            </div>
            <div className="bg-white p-2 rounded-lg border border-neutral-200">
              <span className="font-mono text-neutral-800 font-medium block">npm run lint</span>
              <span className="text-neutral-500 text-[10px]">
                Runs TypeScript type checking (tsc --noEmit)
              </span>
            </div>
          </div>
        </div>

        {/* Docs Reference */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-[11px] text-blue-900">
          <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Detailed deployment, architectural diagrams, and security specifications are in{' '}
            <code className="font-mono font-medium">docs/SETUP_AND_RUN.md</code> and{' '}
            <code className="font-mono font-medium">docs/ARCHITECTURE.md</code>.
          </span>
        </div>

        <div className="pt-2 border-t border-neutral-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </Modal>
  );
};
