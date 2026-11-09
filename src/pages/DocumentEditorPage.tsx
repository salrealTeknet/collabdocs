/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, ArrowLeft } from 'lucide-react';
import { TiptapEditor } from '../components/editor/TiptapEditor';
import { documentService } from '../services/documentService';
import { DocumentWithMeta, UserProfile } from '../types';

interface DocumentEditorPageProps {
  documentId: string;
  currentUser: UserProfile;
  onBack: () => void;
}

export const DocumentEditorPage: React.FC<DocumentEditorPageProps> = ({
  documentId,
  currentUser,
  onBack,
}) => {
  const [document, setDocument] = useState<DocumentWithMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const doc = await documentService.getDocumentById(documentId);
        if (isMounted) {
          setDocument(doc);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err.message ||
              'Unable to load document. You may not have permission to view it or it may have been deleted.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      isMounted = false;
    };
  }, [documentId, currentUser.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <h3 className="text-sm font-semibold text-neutral-800">Loading document...</h3>
        <p className="text-xs text-neutral-500 mt-1">
          Validating authorization permissions and fetching content
        </p>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-neutral-900">Access Denied / Not Found</h3>
        <p className="text-xs text-neutral-500 mt-1 max-w-md">{error}</p>
        <button
          onClick={onBack}
          className="mt-5 px-4 py-2 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Dashboard</span>
        </button>
      </div>
    );
  }

  return (
    <TiptapEditor
      document={document}
      currentUser={currentUser}
      onBack={onBack}
      onDocumentUpdated={updated => setDocument(updated)}
    />
  );
};
