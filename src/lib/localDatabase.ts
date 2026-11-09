/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentRecord, DocumentShareRecord, UserProfile } from '../types';

const STORAGE_KEY_PROFILES = 'collabdocs_profiles_v2';
const STORAGE_KEY_DOCUMENTS = 'collabdocs_documents_v2';
const STORAGE_KEY_SHARES = 'collabdocs_shares_v2';
const STORAGE_KEY_SESSION = 'collabdocs_auth_session_v2';
const STORAGE_KEY_CREDENTIALS = 'collabdocs_credentials_v2';

class LocalDatabase {
  private memoryStore: Record<string, any> = {};

  private getStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') {
      if (!(key in this.memoryStore)) {
        this.memoryStore[key] = JSON.parse(JSON.stringify(defaultValue));
      }
      return this.memoryStore[key];
    }
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
      }
      return JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    if (typeof window === 'undefined') {
      this.memoryStore[key] = JSON.parse(JSON.stringify(value));
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('LocalDatabase storage quota exceeded or failed:', e);
    }
  }

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') {
      this.setStorage(STORAGE_KEY_PROFILES, []);
      this.setStorage(STORAGE_KEY_DOCUMENTS, []);
      this.setStorage(STORAGE_KEY_SHARES, []);
      this.setStorage(STORAGE_KEY_SESSION, null);
      this.setStorage(STORAGE_KEY_CREDENTIALS, {});
      return;
    }
    // Clean start for fresh user onboarding
    if (!localStorage.getItem(STORAGE_KEY_PROFILES)) {
      this.setStorage(STORAGE_KEY_PROFILES, []);
    }
    if (!localStorage.getItem(STORAGE_KEY_DOCUMENTS)) {
      this.setStorage(STORAGE_KEY_DOCUMENTS, []);
    }
    if (!localStorage.getItem(STORAGE_KEY_SHARES)) {
      this.setStorage(STORAGE_KEY_SHARES, []);
    }
    if (!localStorage.getItem(STORAGE_KEY_CREDENTIALS)) {
      this.setStorage(STORAGE_KEY_CREDENTIALS, {});
    }
  }

  // Session Management
  getSessionUser(): UserProfile | null {
    return this.getStorage<UserProfile | null>(STORAGE_KEY_SESSION, null);
  }

  setSessionUser(user: UserProfile | null): void {
    this.setStorage(STORAGE_KEY_SESSION, user);
  }

  // Credentials
  saveCredentials(email: string, password: string): void {
    const creds = this.getStorage<Record<string, string>>(STORAGE_KEY_CREDENTIALS, {});
    creds[email.trim().toLowerCase()] = password;
    this.setStorage(STORAGE_KEY_CREDENTIALS, creds);
  }

  verifyPassword(email: string, password: string): boolean {
    const creds = this.getStorage<Record<string, string>>(STORAGE_KEY_CREDENTIALS, {});
    const stored = creds[email.trim().toLowerCase()];
    // If no password recorded yet for an imported profile, allow verification
    if (!stored) return true;
    return stored === password;
  }

  // Profiles
  getProfiles(): UserProfile[] {
    return this.getStorage<UserProfile[]>(STORAGE_KEY_PROFILES, []);
  }

  getProfileById(id: string): UserProfile | undefined {
    return this.getProfiles().find(p => p.id === id);
  }

  getProfileByEmail(email: string): UserProfile | undefined {
    const normalized = email.trim().toLowerCase();
    return this.getProfiles().find(p => p.email.toLowerCase() === normalized);
  }

  createOrUpdateProfile(profile: UserProfile): UserProfile {
    const profiles = this.getProfiles();
    const index = profiles.findIndex(p => p.id === profile.id || p.email.toLowerCase() === profile.email.toLowerCase());
    if (index >= 0) {
      profiles[index] = { ...profiles[index], ...profile };
    } else {
      profiles.push(profile);
    }
    this.setStorage(STORAGE_KEY_PROFILES, profiles);
    return profile;
  }

  // Documents
  getDocuments(): DocumentRecord[] {
    return this.getStorage<DocumentRecord[]>(STORAGE_KEY_DOCUMENTS, []);
  }

  getDocumentById(id: string): DocumentRecord | undefined {
    return this.getDocuments().find(d => d.id === id);
  }

  createDocument(doc: DocumentRecord): DocumentRecord {
    const docs = this.getDocuments();
    docs.unshift(doc);
    this.setStorage(STORAGE_KEY_DOCUMENTS, docs);
    return doc;
  }

  updateDocument(id: string, updates: Partial<DocumentRecord>): DocumentRecord {
    const docs = this.getDocuments();
    const index = docs.findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error(`Document with ID "${id}" not found.`);
    }
    const updated = {
      ...docs[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    docs[index] = updated;
    this.setStorage(STORAGE_KEY_DOCUMENTS, docs);
    return updated;
  }

  deleteDocument(id: string): boolean {
    const docs = this.getDocuments();
    const filtered = docs.filter(d => d.id !== id);
    this.setStorage(STORAGE_KEY_DOCUMENTS, filtered);

    // Also delete shares for this document
    const shares = this.getShares();
    const filteredShares = shares.filter(s => s.document_id !== id);
    this.setStorage(STORAGE_KEY_SHARES, filteredShares);
    return true;
  }

  // Shares
  getShares(): DocumentShareRecord[] {
    return this.getStorage<DocumentShareRecord[]>(STORAGE_KEY_SHARES, []);
  }

  getDocumentShares(documentId: string): DocumentShareRecord[] {
    return this.getShares().filter(s => s.document_id === documentId);
  }

  createShare(share: DocumentShareRecord): DocumentShareRecord {
    const shares = this.getShares();
    const existingIndex = shares.findIndex(
      s => s.document_id === share.document_id && s.shared_with_user_id === share.shared_with_user_id
    );
    if (existingIndex >= 0) {
      shares[existingIndex].permission = share.permission;
    } else {
      shares.push(share);
    }
    this.setStorage(STORAGE_KEY_SHARES, shares);
    return share;
  }

  updateSharePermission(shareId: string, permission: 'viewer' | 'editor'): void {
    const shares = this.getShares();
    const item = shares.find(s => s.id === shareId);
    if (item) {
      item.permission = permission;
      this.setStorage(STORAGE_KEY_SHARES, shares);
    }
  }

  deleteShare(shareId: string): void {
    const shares = this.getShares();
    const filtered = shares.filter(s => s.id !== shareId);
    this.setStorage(STORAGE_KEY_SHARES, filtered);
  }

  resetToDefaults(): void {
    this.memoryStore = {};
    this.setStorage(STORAGE_KEY_PROFILES, []);
    this.setStorage(STORAGE_KEY_DOCUMENTS, []);
    this.setStorage(STORAGE_KEY_SHARES, []);
    this.setStorage(STORAGE_KEY_SESSION, null);
    this.setStorage(STORAGE_KEY_CREDENTIALS, {});
  }
}

export const localDB = new LocalDatabase();
