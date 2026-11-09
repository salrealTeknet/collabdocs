/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JSONContent } from '@tiptap/react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { localDB } from '../lib/localDatabase';
import { DocumentRecord, DocumentWithMeta, UserRole } from '../types';
import { authService } from './authService';
import { sharingService } from './sharingService';

const DEFAULT_INITIAL_CONTENT: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: '' }],
    },
  ],
};

export const documentService = {
  /**
   * Validates document title
   */
  validateTitle(title: string): { isValid: boolean; error?: string } {
    if (!title || title.trim().length === 0) {
      return { isValid: false, error: 'Document title cannot be empty.' };
    }
    if (title.trim().length > 150) {
      return { isValid: false, error: 'Document title must be under 150 characters.' };
    }
    return { isValid: true };
  },

  /**
   * Fetch all documents accessible to the current user (both owned and shared)
   */
  async getDocuments(): Promise<{ owned: DocumentWithMeta[]; shared: DocumentWithMeta[] }> {
    const user = await authService.getCurrentUser();
    if (!user) {
      return { owned: [], shared: [] };
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      try {
        // 1. Fetch owned documents
        const { data: ownedDocs, error: ownedErr } = await supabase
          .from('documents')
          .select('*')
          .eq('owner_id', user.id)
          .order('updated_at', { ascending: false });

        if (ownedErr) throw new Error(ownedErr.message);

        // 2. Fetch shared documents via document_shares
        const { data: sharedRows, error: sharedErr } = await supabase
          .from('document_shares')
          .select(`
            id,
            permission,
            documents:document_id (
              id,
              owner_id,
              title,
              content,
              created_at,
              updated_at,
              profiles:owner_id (id, email, full_name, created_at)
            )
          `)
          .eq('shared_with_user_id', user.id);

        if (sharedErr) throw new Error(sharedErr.message);

        const owned: DocumentWithMeta[] = (ownedDocs || []).map(doc => ({
          ...doc,
          owner: user,
          permission: 'owner' as UserRole,
          isOwner: true,
        }));

        const shared: DocumentWithMeta[] = (sharedRows || [])
          .filter(row => row.documents)
          .map((row: any) => {
            const d = row.documents;
            return {
              id: d.id,
              owner_id: d.owner_id,
              title: d.title,
              content: d.content,
              created_at: d.created_at,
              updated_at: d.updated_at,
              owner: d.profiles,
              permission: row.permission as UserRole,
              isOwner: false,
            };
          });

        return { owned, shared };
      } catch (err) {
        console.warn('Failed to fetch documents from Supabase, falling back to local store:', err);
      }
    }

    // Local Database mode
    const allDocs = localDB.getDocuments();
    const allShares = localDB.getShares();

    const owned: DocumentWithMeta[] = allDocs
      .filter(doc => doc.owner_id === user.id)
      .map(doc => ({
        ...doc,
        owner: user,
        permission: 'owner' as UserRole,
        isOwner: true,
        sharesCount: localDB.getDocumentShares(doc.id).length,
      }))
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const userShares = allShares.filter(s => s.shared_with_user_id === user.id);
    const shared: DocumentWithMeta[] = [];
    for (const share of userShares) {
      const doc = localDB.getDocumentById(share.document_id);
      if (doc) {
        const owner = localDB.getProfileById(doc.owner_id);
        shared.push({
          ...doc,
          owner,
          permission: share.permission as UserRole,
          isOwner: false,
        });
      }
    }
    shared.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return { owned, shared };
  },

  /**
   * Fetch a single document by ID, checking authorization
   */
  async getDocumentById(documentId: string): Promise<DocumentWithMeta> {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required to access documents.');
    }

    const permission = await sharingService.getUserPermission(documentId, user.id);
    if (!permission) {
      throw new Error('Access denied: You do not have permission to view this document.');
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data: doc, error } = await supabase
        .from('documents')
        .select(`
          id,
          owner_id,
          title,
          content,
          created_at,
          updated_at,
          profiles:owner_id (id, email, full_name, created_at)
        `)
        .eq('id', documentId)
        .single();

      if (error || !doc) {
        throw new Error('Document not found or inaccessible.');
      }

      return {
        id: doc.id,
        owner_id: doc.owner_id,
        title: doc.title,
        content: doc.content,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        owner: (doc as any).profiles,
        permission,
        isOwner: permission === 'owner',
      };
    }

    // Local mode
    const doc = localDB.getDocumentById(documentId);
    if (!doc) {
      throw new Error('Document not found.');
    }

    const owner = localDB.getProfileById(doc.owner_id);

    return {
      ...doc,
      owner,
      permission,
      isOwner: permission === 'owner',
    };
  },

  /**
   * Create a new document
   */
  async createDocument(title = 'Untitled Document', initialContent?: JSONContent): Promise<DocumentRecord> {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required to create a document.');
    }

    const validation = this.validateTitle(title);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const content = initialContent || DEFAULT_INITIAL_CONTENT;
    const now = new Date().toISOString();

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('documents')
        .insert([
          {
            owner_id: user.id,
            title: title.trim(),
            content,
          },
        ])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create document: ${error.message}`);
      }

      return data as DocumentRecord;
    }

    // Local DB
    const newDoc: DocumentRecord = {
      id: `doc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      owner_id: user.id,
      title: title.trim(),
      content,
      created_at: now,
      updated_at: now,
    };

    return localDB.createDocument(newDoc);
  },

  /**
   * Update an existing document (title or content)
   */
  async updateDocument(
    documentId: string,
    updates: { title?: string; content?: JSONContent }
  ): Promise<DocumentRecord> {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required to save document.');
    }

    const permission = await sharingService.getUserPermission(documentId, user.id);
    if (!permission) {
      throw new Error('Unauthorized: You do not have access to this document.');
    }

    // Viewers cannot make any modifications
    if (permission === 'viewer') {
      throw new Error('Read-only: Viewers cannot modify document title or content.');
    }

    // Renaming restriction: only owner can rename
    if (updates.title !== undefined) {
      if (permission !== 'owner') {
        throw new Error('Permission denied: Only the document owner can rename this document.');
      }
      const titleVal = this.validateTitle(updates.title);
      if (!titleVal.isValid) {
        throw new Error(titleVal.error);
      }
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const payload: Record<string, any> = {};
      if (updates.title !== undefined) payload.title = updates.title.trim();
      if (updates.content !== undefined) payload.content = updates.content;
      payload.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('documents')
        .update(payload)
        .eq('id', documentId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update document: ${error.message}`);
      }

      return data as DocumentRecord;
    }

    // Local mode
    return localDB.updateDocument(documentId, updates);
  },

  /**
   * Delete a document (Owner only)
   */
  async deleteDocument(documentId: string): Promise<void> {
    const user = await authService.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required to delete a document.');
    }

    const permission = await sharingService.getUserPermission(documentId, user.id);
    if (permission !== 'owner') {
      throw new Error('Permission denied: Only the document owner can delete this document.');
    }

    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) {
        throw new Error(`Failed to delete document: ${error.message}`);
      }
      return;
    }

    // Local mode
    localDB.deleteDocument(documentId);
  },
};
