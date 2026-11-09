/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  MoreVertical,
  Edit2,
  Trash2,
  Share2,
  Clock,
  Eye,
  Crown,
  FileEdit,
} from 'lucide-react';
import { DocumentWithMeta } from '../../types';

interface DocumentCardProps {
  document: DocumentWithMeta;
  onOpen: (documentId: string) => void;
  onRename: (doc: DocumentWithMeta) => void;
  onDelete: (doc: DocumentWithMeta) => void;
  onShare: (doc: DocumentWithMeta) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onOpen,
  onRename,
  onDelete,
  onShare,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const formattedDate = new Date(document.updated_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isOwner = document.isOwner;
  const permission = document.permission;

  return (
    <div
      onClick={() => onOpen(document.id)}
      className="group relative bg-white rounded-xl border border-neutral-200/90 hover:border-blue-500/60 p-4 transition-all duration-150 hover:shadow-md cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Top bar with icon and actions */}
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 flex items-center justify-center transition-colors">
            <FileText className="w-5 h-5" />
          </div>

          <div
            className="relative"
            onClick={e => {
              e.stopPropagation();
            }}
          >
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
              aria-label="Document options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-neutral-200 py-1 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpen(document.id);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                  >
                    <FileText className="w-3.5 h-3.5 text-neutral-500" />
                    Open Editor
                  </button>

                  {isOwner && (
                    <>
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onRename(document);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-neutral-500" />
                        Rename
                      </button>

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onShare(document);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                      >
                        <Share2 className="w-3.5 h-3.5 text-neutral-500" />
                        Share Settings
                      </button>

                      <div className="border-t border-neutral-100 my-1" />

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(document);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-neutral-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
          {document.title}
        </h3>

        {/* Owner */}
        <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5">
          <span>{document.owner?.full_name || 'Author'}</span>
          <span className="text-neutral-300">•</span>
          <span className="truncate">{document.owner?.email}</span>
        </p>
      </div>

      {/* Footer details */}
      <div className="pt-3 mt-3 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-400">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-neutral-400" />
          <span>{formattedDate}</span>
        </div>

        {/* Status Badge */}
        <div>
          {isOwner ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <Crown className="w-2.5 h-2.5" />
              Owner
            </span>
          ) : permission === 'editor' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              <FileEdit className="w-2.5 h-2.5" />
              Editor
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
              <Eye className="w-2.5 h-2.5" />
              Viewer
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
