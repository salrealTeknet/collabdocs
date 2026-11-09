/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Shield,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Crown,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { sharingService } from '../../services/sharingService';
import { DocumentShareRecord, DocumentWithMeta, UserProfile } from '../../types';

interface ShareModalProps {
  isOpen: boolean;
  document: DocumentWithMeta | null;
  currentUser: UserProfile | null;
  onClose: () => void;
  onSharesUpdated?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  document,
  currentUser,
  onClose,
  onSharesUpdated,
}) => {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'viewer' | 'editor'>('editor');
  const [shares, setShares] = useState<DocumentShareRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isOwner = document?.isOwner ?? false;

  const loadShares = async () => {
    if (!document) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await sharingService.getDocumentShares(document.id);
      setShares(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch collaborator list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && document) {
      loadShares();
      setEmail('');
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, document]);

  if (!document) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !email.includes('@')) {
      setError('Please provide a valid recipient email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      await sharingService.shareDocument(document.id, email.trim(), permission);
      setEmail('');
      setSuccessMsg(`Document successfully shared with ${email}.`);
      await loadShares();
      if (onSharesUpdated) onSharesUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to share document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePermission = async (shareId: string, newPermission: 'viewer' | 'editor') => {
    try {
      setError(null);
      await sharingService.updateSharePermission(shareId, newPermission);
      await loadShares();
      if (onSharesUpdated) onSharesUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to update collaborator permission.');
    }
  };

  const handleRevoke = async (shareId: string, targetEmail: string) => {
    try {
      setError(null);
      await sharingService.revokeShare(shareId);
      setSuccessMsg(`Access revoked for ${targetEmail}.`);
      await loadShares();
      if (onSharesUpdated) onSharesUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to revoke collaborator access.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Document"
      description={`Manage collaborator access for "${document.title}"`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {error && (
          <div className="p-3 rounded-lg text-xs bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Non-owner notice */}
        {!isOwner && (
          <div className="p-3 rounded-lg text-xs bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You have {document.permission} access. Only the document owner (
              {document.owner?.email || 'Owner'}) can add collaborators or modify sharing settings.
            </span>
          </div>
        )}

        {/* Share form (Owner only) */}
        {isOwner && (
          <form onSubmit={handleShare} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Add Collaborator by Email
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="collaborator@collabdocs.dev"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  className="flex-1 px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />

                <select
                  value={permission}
                  onChange={e => setPermission(e.target.value as 'viewer' | 'editor')}
                  className="px-2.5 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="editor">Editor (Can edit)</option>
                  <option value="viewer">Viewer (Read-only)</option>
                </select>

                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Sharing...' : 'Share'}
                </button>
              </div>

            </div>
          </form>
        )}

        {/* Existing Collaborators List */}
        <div className="border-t border-neutral-100 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            People with access
          </h4>

          {/* Owner row */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50/80 mb-2 border border-neutral-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                {document.owner?.full_name ? document.owner.full_name[0].toUpperCase() : 'O'}
              </div>
              <div>
                <div className="text-xs font-medium text-neutral-900 flex items-center gap-1.5">
                  {document.owner?.full_name || 'Document Owner'}
                  {document.isOwner && (
                    <span className="text-[10px] text-neutral-400 font-normal">(you)</span>
                  )}
                </div>
                <div className="text-[11px] text-neutral-500">{document.owner?.email}</div>
              </div>
            </div>
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Owner
            </span>
          </div>

          {/* Collaborator shares */}
          {isLoading ? (
            <div className="text-center py-4 text-xs text-neutral-400">Loading collaborators...</div>
          ) : shares.length === 0 ? (
            <div className="text-center py-4 text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-lg">
              Not shared with anyone yet. Only you have access.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {shares.map(share => {
                const profile = share.profile;
                const isCurrentUser = profile?.id === currentUser?.id;
                return (
                  <div
                    key={share.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-50 border border-transparent hover:border-neutral-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center text-xs font-medium shrink-0">
                        {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-neutral-800 truncate flex items-center gap-1">
                          {profile?.full_name || 'Collaborator'}
                          {isCurrentUser && (
                            <span className="text-[10px] text-neutral-400 font-normal">(you)</span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate">
                          {profile?.email || 'user@collabdocs.dev'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOwner ? (
                        <>
                          <select
                            value={share.permission}
                            onChange={e =>
                              handleUpdatePermission(
                                share.id,
                                e.target.value as 'viewer' | 'editor'
                              )
                            }
                            className="text-xs border border-neutral-200 rounded-md px-2 py-1 bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleRevoke(share.id, profile?.email || 'collaborator')}
                            className="p-1 rounded text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Revoke access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs capitalize font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded">
                          {share.permission}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
