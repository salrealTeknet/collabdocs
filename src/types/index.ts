/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JSONContent } from '@tiptap/react';

export type UserRole = 'owner' | 'editor' | 'viewer';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface DocumentRecord {
  id: string;
  owner_id: string;
  title: string;
  content: JSONContent;
  created_at: string;
  updated_at: string;
}

export interface DocumentShareRecord {
  id: string;
  document_id: string;
  shared_with_user_id: string;
  permission: 'viewer' | 'editor';
  created_at: string;
  profile?: UserProfile;
}

export interface DocumentWithMeta extends DocumentRecord {
  owner?: UserProfile;
  permission: UserRole;
  isOwner: boolean;
  sharesCount?: number;
}

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface FileImportResult {
  title: string;
  content: JSONContent;
  rawText: string;
  fileType: 'markdown' | 'text';
}

export interface SupabaseConfigState {
  isConfigured: boolean;
  url: string;
  anonKey: string;
  mode: 'supabase' | 'local';
}
