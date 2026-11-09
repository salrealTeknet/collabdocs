/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Share2,
  Save,
  Lock,
  Edit2,
} from 'lucide-react';
import { SaveStatus, DocumentWithMeta } from '../../types';
import { documentService } from '../../services/documentService';

interface EditorHeaderProps {
  document: DocumentWithMeta;
  saveStatus: SaveStatus;
  isReadOnly: boolean;
  onBack: () => void;
  onManualSave: () => void;
  onOpenShare: () => void;
  onTitleUpdated: (newTitle: string) => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  document,
  saveStatus,
  isReadOnly,
  onBack,
  onManualSave,
  onOpenShare,
  onTitleUpdated,
}) => {
  const [title, setTitle] = useState(document.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    setTitle(document.title);
  }, [document.title]);

  const handleTitleSubmit = async () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(document.title);
      setIsEditingTitle(false);
      setTitleError(null);
      return;
    }

    if (trimmed === document.title) {
      setIsEditingTitle(false);
      return;
    }

    const val = documentService.validateTitle(trimmed);
    if (!val.isValid) {
      setTitleError(val.error || 'Invalid title');
      return;
    }

    try {
      await documentService.updateDocument(document.id, { title: trimmed });
      onTitleUpdated(trimmed);
      setIsEditingTitle(false);
      setTitleError(null);
    } catch (err: any) {
      setTitleError(err.message || 'Failed to rename.');
      setTitle(document.title);
      setIsEditingTitle(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSubmit();
    } else if (e.key === 'Escape') {
      setTitle(document.title);
      setIsEditingTitle(false);
      setTitleError(null);
    }
  };

  return (
    <div className="bg-white border-b border-neutral-200 sticky top-0 z-40">
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
        {/* Left: Back + Title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors shrink-0"
            title="Return to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            {isEditingTitle && !isReadOnly ? (
              <div className="relative flex items-center">
                <input
                  type="text"
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={handleKeyDown}
                  className="px-2 py-1 text-sm font-semibold text-neutral-900 border border-blue-500 rounded-md focus:outline-none ring-2 ring-blue-100 min-w-[200px]"
                  maxLength={150}
                />
              </div>
            ) : (
              <div
                onClick={() => {
                  if (!isReadOnly && document.isOwner) setIsEditingTitle(true);
                }}
                className={`group flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-semibold text-neutral-900 truncate transition-colors ${
                  !isReadOnly && document.isOwner
                    ? 'hover:bg-neutral-100 cursor-pointer'
                    : 'cursor-default'
                }`}
                title={document.isOwner ? 'Click to rename document' : document.title}
              >
                <span className="truncate">{title}</span>
                {!isReadOnly && document.isOwner && (
                  <Edit2 className="w-3 h-3 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                )}
              </div>
            )}

            {titleError && (
              <span className="text-[11px] text-rose-600 shrink-0">{titleError}</span>
            )}
          </div>
        </div>

        {/* Right: Autosave Status, Manual Save, Share */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Save Status Feedback */}
          <div className="text-xs flex items-center gap-1.5 px-2 py-1 rounded-md">
            {saveStatus === 'saving' && (
              <span className="text-neutral-500 flex items-center gap-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span className="hidden sm:inline">Saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Saved</span>
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="text-amber-600 flex items-center gap-1 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="hidden sm:inline">Unsaved changes</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <button
                type="button"
                onClick={onManualSave}
                className="text-rose-600 hover:text-rose-700 flex items-center gap-1 font-medium underline"
                title="Retry saving"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Save failed (Retry)</span>
              </button>
            )}
          </div>

          {/* Manual Save Button */}
          {!isReadOnly && (
            <button
              onClick={onManualSave}
              disabled={saveStatus === 'saving' || saveStatus === 'saved'}
              className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-neutral-200 text-xs text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              title="Save now (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Save</span>
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Read-Only Notice Bar for Viewers */}
      {isReadOnly && (
        <div className="bg-amber-50/80 border-t border-amber-200/60 px-4 py-1.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>
              <strong>Viewing Mode:</strong> You have read-only access to this document. Only the
              owner and authorized editors can modify content.
            </span>
          </div>
          <span className="text-[11px] text-amber-700 font-medium">Read-Only</span>
        </div>
      )}
    </div>
  );
};
