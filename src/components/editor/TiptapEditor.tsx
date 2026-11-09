/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorToolbar } from './EditorToolbar';
import { EditorHeader } from './EditorHeader';
import { ShareModal } from '../documents/ShareModal';
import { DocumentWithMeta, SaveStatus, UserProfile } from '../../types';
import { documentService } from '../../services/documentService';

interface TiptapEditorProps {
  document: DocumentWithMeta;
  currentUser: UserProfile | null;
  onBack: () => void;
  onDocumentUpdated: (doc: DocumentWithMeta) => void;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  document: initialDoc,
  currentUser,
  onBack,
  onDocumentUpdated,
}) => {
  const [docMeta, setDocMeta] = useState<DocumentWithMeta>(initialDoc);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestContentRef = useRef<JSONContent | null>(null);
  const isSavingRef = useRef<boolean>(false);
  const hasPendingSaveRef = useRef<boolean>(false);

  const isReadOnly = docMeta.permission === 'viewer';

  // Save handler with concurrent race protection
  const executeSave = useCallback(
    async (contentToSave: JSONContent) => {
      if (isReadOnly) return;

      if (isSavingRef.current) {
        hasPendingSaveRef.current = true;
        return;
      }

      isSavingRef.current = true;
      setSaveStatus('saving');

      try {
        const updated = await documentService.updateDocument(docMeta.id, {
          content: contentToSave,
        });

        setDocMeta(prev => ({
          ...prev,
          updated_at: updated.updated_at,
          content: updated.content,
        }));
        onDocumentUpdated({
          ...docMeta,
          updated_at: updated.updated_at,
          content: updated.content,
        });

        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save document:', err);
        setSaveStatus('error');
      } finally {
        isSavingRef.current = false;
        if (hasPendingSaveRef.current && latestContentRef.current) {
          hasPendingSaveRef.current = false;
          executeSave(latestContentRef.current);
        }
      }
    },
    [docMeta, isReadOnly, onDocumentUpdated]
  );

  // Initialize Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: isReadOnly
          ? 'This document is read-only...'
          : 'Type something brilliant, or paste Markdown here...',
      }),
    ],
    content: initialDoc.content,
    editable: !isReadOnly,
    onUpdate: ({ editor }) => {
      if (isReadOnly) return;

      const json = editor.getJSON();
      latestContentRef.current = json;
      setSaveStatus('unsaved');

      // Update metrics
      const text = editor.getText();
      setCharCount(text.length);
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);

      // Debounce autosave (approx 1000ms)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        executeSave(json);
      }, 1000);
    },
  });

  // Calculate initial metrics
  useEffect(() => {
    if (editor) {
      const text = editor.getText();
      setCharCount(text.length);
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);
    }
  }, [editor]);

  // Keep editor editable state in sync if permission changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!isReadOnly);
    }
  }, [isReadOnly, editor]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (latestContentRef.current && !isReadOnly) {
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          executeSave(latestContentRef.current);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [executeSave, isReadOnly]);

  // Manual save trigger
  const handleManualSave = () => {
    if (editor && !isReadOnly) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      executeSave(editor.getJSON());
    }
  };

  const handleTitleUpdated = (newTitle: string) => {
    setDocMeta(prev => ({ ...prev, title: newTitle }));
    onDocumentUpdated({ ...docMeta, title: newTitle });
  };

  return (
    <div className="min-h-screen bg-neutral-100/70 flex flex-col">
      {/* Editor Header Navigation */}
      <EditorHeader
        document={docMeta}
        saveStatus={saveStatus}
        isReadOnly={isReadOnly}
        onBack={onBack}
        onManualSave={handleManualSave}
        onOpenShare={() => setIsShareModalOpen(true)}
        onTitleUpdated={handleTitleUpdated}
      />

      {/* Formatting Toolbar */}
      <EditorToolbar editor={editor} isReadOnly={isReadOnly} />

      {/* Main Document Workspace */}
      <div className="flex-1 py-8 px-4 sm:px-6 overflow-y-auto flex justify-center">
        <div className="w-full max-w-4xl bg-white rounded-xl shadow-xs border border-neutral-200/90 p-8 sm:p-14 min-h-[750px] transition-shadow">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Document Metrics Footer */}
      <div className="h-8 bg-white border-t border-neutral-200 px-6 flex items-center justify-between text-[11px] text-neutral-400 select-none">
        <div className="flex items-center gap-4">
          <span>{wordCount} words</span>
          <span>{charCount} characters</span>
          <span>Permission: <strong className="capitalize text-neutral-600">{docMeta.permission}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span>CollabDocs Editor</span>
          <span>•</span>
          <span>Press Ctrl+S to save</span>
        </div>
      </div>

      {/* Sharing Dialog */}
      <ShareModal
        isOpen={isShareModalOpen}
        document={docMeta}
        currentUser={currentUser}
        onClose={() => setIsShareModalOpen(false)}
        onSharesUpdated={() => {
          // Refresh metadata if needed
        }}
      />
    </div>
  );
};
