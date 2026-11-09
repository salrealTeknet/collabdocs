/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, FileCode } from 'lucide-react';
import { Modal } from '../common/Modal';
import { fileImportService } from '../../services/fileImportService';
import { documentService } from '../../services/documentService';
import { FileImportResult, DocumentRecord } from '../../types';

interface ImportDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (doc: DocumentRecord) => void;
}

export const ImportDocumentModal: React.FC<ImportDocumentModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<FileImportResult | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setParsedData(null);
    setCustomTitle('');
    setError(null);
    setIsLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = async (file: File) => {
    setError(null);
    const validation = fileImportService.validateFile(file);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file format.');
      setSelectedFile(null);
      setParsedData(null);
      return;
    }

    try {
      setIsLoading(true);
      const parsed = await fileImportService.parseFile(file);
      setSelectedFile(file);
      setParsedData(parsed);
      setCustomTitle(parsed.title);
    } catch (err: any) {
      setError(err.message || 'Failed to read file.');
      setSelectedFile(null);
      setParsedData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedData) return;

    const titleToUse = customTitle.trim() || parsedData.title;
    const titleVal = documentService.validateTitle(titleToUse);
    if (!titleVal.isValid) {
      setError(titleVal.error || 'Invalid title');
      return;
    }

    try {
      setIsLoading(true);
      const newDoc = await documentService.createDocument(titleToUse, parsedData.content);
      handleClose();
      onImportSuccess(newDoc);
    } catch (err: any) {
      setError(err.message || 'Failed to create document from imported file.');
    } finally {
      setIsLoading(false);
    }
  };

  const nodeCount = parsedData?.content.content?.length || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Document (.md / .txt)"
      description="Upload a Markdown or plain text document to automatically convert into rich-text"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg text-xs bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dropzone */}
        {!selectedFile ? (
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/60'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-800">
              Click to browse or drop your document here
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              Supports <span className="font-mono font-medium text-neutral-700">.md</span>,{' '}
              <span className="font-mono font-medium text-neutral-700">.markdown</span>, or{' '}
              <span className="font-mono font-medium text-neutral-700">.txt</span> (Max 2 MB)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File info banner */}
            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  {parsedData?.fileType === 'markdown' ? (
                    <FileCode className="w-5 h-5" />
                  ) : (
                    <FileText className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                    {selectedFile.name}
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-neutral-200/80 text-neutral-700">
                      {parsedData?.fileType}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB • {nodeCount} structured elements detected
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={resetState}
                className="text-xs text-neutral-500 hover:text-neutral-800 underline"
              >
                Change
              </button>
            </div>

            {/* Editable Title */}
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Document title"
                maxLength={150}
              />
            </div>

            {/* Ingestion Preview Summary */}
            <div className="text-[11px] text-neutral-600 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                Markdown formatting (headings, lists, bold, italics) has been mapped directly to
                Tiptap structured JSON.
              </div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-3.5 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-800 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedFile || isLoading}
            className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            {isLoading ? 'Converting & Saving...' : 'Import to Editor'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
