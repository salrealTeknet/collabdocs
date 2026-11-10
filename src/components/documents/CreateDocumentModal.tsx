/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, FileText, AlertCircle, Database, Copy, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { documentService } from '../../services/documentService';
import { DocumentRecord } from '../../types';
import { SqlMigrationModal } from '../common/SqlMigrationModal';
import { INITIAL_SCHEMA_SQL } from '../../lib/migrationSql';

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (doc: DocumentRecord) => void;
}

export const CreateDocumentModal: React.FC<CreateDocumentModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [copiedQuickSql, setCopiedQuickSql] = useState(false);

  const isSchemaError = Boolean(
    error &&
    (error.toLowerCase().includes('schema cache') ||
     error.toLowerCase().includes('public.documents') ||
     error.toLowerCase().includes('relation') ||
     error.toLowerCase().includes('not found'))
  );

  const handleCopySql = () => {
    navigator.clipboard.writeText(INITIAL_SCHEMA_SQL);
    setCopiedQuickSql(true);
    setTimeout(() => setCopiedQuickSql(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = documentService.validateTitle(title);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid title');
      return;
    }

    try {
      setIsSubmitting(true);
      const newDoc = await documentService.createDocument(title.trim());
      setTitle('');
      onCreated(newDoc);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Create New Document"
        description="Initialize a blank document ready for rich-text writing and collaboration"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="space-y-2.5">
              <div className="p-3 rounded-lg text-xs bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold block">Failed to create document</span>
                  <span className="leading-tight block">{error}</span>
                </div>
              </div>

              {isSchemaError && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-amber-950">
                    <Database className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Supabase Database Migration Required</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    The table <code className="bg-amber-100/90 px-1 py-0.5 rounded font-mono font-medium">public.documents</code> does not exist in your Supabase project yet. Paste the migration SQL into your Supabase SQL Editor to initialize your database tables and security rules.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="py-1 px-2.5 text-[11px] font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedQuickSql ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied SQL!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy SQL Script</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMigrationModalOpen(true)}
                      className="py-1 px-2.5 text-[11px] font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer"
                    >
                      View Instructions
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Document Title
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
              <input
                type="text"
                autoFocus
                placeholder="e.g. Q3 Engineering Roadmap"
                value={title}
                onChange={e => {
                  setTitle(e.target.value);
                  if (error) setError(null);
                }}
                className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                maxLength={150}
              />
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Max 150 characters. Can be renamed anytime by the owner.
            </p>
          </div>

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-800 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {isSubmitting ? 'Creating...' : 'Create Document'}
            </button>
          </div>
        </form>
      </Modal>

      <SqlMigrationModal
        isOpen={isMigrationModalOpen}
        onClose={() => setIsMigrationModalOpen(false)}
      />
    </>
  );
};
