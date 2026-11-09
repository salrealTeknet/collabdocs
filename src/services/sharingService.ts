/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { localDB } from '../lib/localDatabase';
import { DocumentShareRecord, UserRole } from '../types';
import { authService } from './authService';

export const sharingService = {
  /**
   * Determine the current user's effective permission for a document
   */
  async getUserPermission(documentId: string, userId: string): Promise<UserRole | null> {
    if (!documentId || !userId) return null;

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        // Check if owner
        const { data: doc, error: docError } = await supabase
          .from('documents')
          .select('owner_id')
          .eq('id', documentId)
          .single();

        if (!docError && doc) {
          if (doc.owner_id === userId) return 'owner';
        }

        // Check if shared
        const { data: share, error: shareError } = await supabase
          .from('document_shares')
          .select('permission')
          .eq('document_id', documentId)
          .eq('shared_with_user_id', userId)
          .single();

        if (!shareError && share) {
          return share.permission as 'editor' | 'viewer';
        }

        return null;
      } catch (err) {
        console.warn('Error checking permission in Supabase:', err);
      }
    }

    // Local mode check
    const doc = localDB.getDocumentById(documentId);
    if (!doc) return null;
    if (doc.owner_id === userId) return 'owner';

    const shares = localDB.getDocumentShares(documentId);
    const userShare = shares.find(s => s.shared_with_user_id === userId);
    if (userShare) {
      return userShare.permission;
    }

    return null;
  },

  /**
   * Fetch all active share records for a document
   */
  async getDocumentShares(documentId: string): Promise<DocumentShareRecord[]> {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required to access document permissions.');
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('document_shares')
        .select(`
          id,
          document_id,
          shared_with_user_id,
          permission,
          created_at,
          profiles:shared_with_user_id (id, email, full_name, created_at)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        document_id: row.document_id,
        shared_with_user_id: row.shared_with_user_id,
        permission: row.permission,
        created_at: row.created_at,
        profile: row.profiles,
      }));
    }

    // Local DB
    const shares = localDB.getDocumentShares(documentId);
    return shares.map(s => ({
      ...s,
      profile: localDB.getProfileById(s.shared_with_user_id),
    }));
  },

  /**
   * Share a document with a collaborator by email
   */
  async shareDocument(
    documentId: string,
    recipientEmail: string,
    permission: 'viewer' | 'editor'
  ): Promise<DocumentShareRecord> {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required to share documents.');
    }

    const cleanEmail = recipientEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please provide a valid recipient email address.');
    }

    if (cleanEmail === user.email.toLowerCase()) {
      throw new Error('You cannot share a document with yourself.');
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      // Find recipient profile
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .eq('email', cleanEmail)
        .limit(1);

      if (profileErr || !profiles || profiles.length === 0) {
        throw new Error(`No registered user found with email "${cleanEmail}". Make sure the collaborator has created an account.`);
      }

      const recipient = profiles[0];

      // Upsert share record
      const { data, error } = await supabase
        .from('document_shares')
        .upsert(
          [
            {
              document_id: documentId,
              shared_with_user_id: recipient.id,
              permission,
            },
          ],
          { onConflict: 'document_id,shared_with_user_id' }
        )
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to grant permission: ${error.message}`);
      }

      return {
        id: data.id,
        document_id: data.document_id,
        shared_with_user_id: data.shared_with_user_id,
        permission: data.permission,
        created_at: data.created_at,
        profile: recipient,
      };
    }

    // Local mode
    const recipient = localDB.getProfileByEmail(cleanEmail);
    if (!recipient) {
      throw new Error(`No registered user found with email "${cleanEmail}". Make sure the collaborator has created an account first.`);
    }

    const shareRecord: DocumentShareRecord = {
      id: `share-${Date.now().toString(36)}`,
      document_id: documentId,
      shared_with_user_id: recipient.id,
      permission,
      created_at: new Date().toISOString(),
      profile: recipient,
    };

    localDB.createShare(shareRecord);
    return shareRecord;
  },

  /**
   * Update an existing collaborator's permission
   */
  async updateSharePermission(shareId: string, permission: 'viewer' | 'editor'): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { error } = await supabase
        .from('document_shares')
        .update({ permission })
        .eq('id', shareId);

      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    localDB.updateSharePermission(shareId, permission);
  },

  /**
   * Revoke access for a collaborator
   */
  async revokeShare(shareId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { error } = await supabase
        .from('document_shares')
        .delete()
        .eq('id', shareId);

      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    localDB.deleteShare(shareId);
  },
};
