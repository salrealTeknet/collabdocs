/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Edit3, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { documentService } from '../../services/documentService';
import { DocumentWithMeta } from '../../types';

interface RenameDocumentModalProps {
  isOpen: boolean;
  document: DocumentWithMeta | null;
  onClose: () => void;
  onRenamed: (documentId: string, newTitle: string) => void;
}

export const RenameDocumentModal: React.FC<RenameDocumentModalProps> = ({
  isOpen,
  document,
  onClose,
  onRenamed,
}) => {
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setError(null);
    }
  }, [document, isOpen]);

  if (!document) return null;

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
      await documentService.updateDocument(document.id, { title: title.trim() });
      onRenamed(document.id, title.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to rename document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rename Document"
      description="Update the title for this document"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg text-xs bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1.5">
            New Title
          </label>
          <div className="relative">
            <Edit3 className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              autoFocus
              value={title}
              onChange={e => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              maxLength={150}
            />
          </div>
        </div>

        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-800 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim() || title.trim() === document.title}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Title'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
