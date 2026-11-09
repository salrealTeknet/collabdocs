/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, FileText, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { documentService } from '../../services/documentService';
import { DocumentRecord } from '../../types';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Document"
      description="Initialize a blank document ready for rich-text writing and collaboration"
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
            className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-800 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 disabled:pointer-events-none"
          >
            <Plus className="w-3.5 h-3.5" />
            {isSubmitting ? 'Creating...' : 'Create Document'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
