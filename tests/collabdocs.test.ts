/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { documentService } from '../src/services/documentService';
import { fileImportService } from '../src/services/fileImportService';
import { sharingService } from '../src/services/sharingService';
import { authService } from '../src/services/authService';
import { localDB } from '../src/lib/localDatabase';

describe('CollabDocs Core Service & Security Test Suite', () => {
  beforeEach(() => {
    // Reset local database to empty state before each test
    localDB.resetToDefaults();
  });

  // --------------------------------------------------------------------------
  // 1. Profile Creation & Document Creation
  // --------------------------------------------------------------------------
  describe('User Profile & Document Creation', () => {
    it('allows a user to create a real profile and create documents', async () => {
      const user = await authService.signUp('user1@example.com', 'SecurePassword123', 'John Doe');
      expect(user).toBeDefined();
      expect(user.email).toBe('user1@example.com');
      expect(user.full_name).toBe('John Doe');

      const doc = await documentService.createDocument('Sprint 44 Retrospective');
      expect(doc).toBeDefined();
      expect(doc.id).toBeDefined();
      expect(doc.title).toBe('Sprint 44 Retrospective');
      expect(doc.owner_id).toBe(user.id);
      expect(doc.content).toBeDefined();
      expect(doc.content.type).toBe('doc');
    });

    it('validates document title rules: rejects empty, whitespace-only, and oversized titles', () => {
      // Empty title
      const emptyCheck = documentService.validateTitle('');
      expect(emptyCheck.isValid).toBe(false);
      expect(emptyCheck.error).toContain('cannot be empty');

      // Whitespace only
      const spacesCheck = documentService.validateTitle('     ');
      expect(spacesCheck.isValid).toBe(false);

      // Oversized title (>150 chars)
      const oversized = 'A'.repeat(151);
      const overCheck = documentService.validateTitle(oversized);
      expect(overCheck.isValid).toBe(false);
      expect(overCheck.error).toContain('under 150 characters');

      // Valid title
      const validCheck = documentService.validateTitle('Valid Document Title');
      expect(validCheck.isValid).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Document Content Formatting Persistence (Tiptap Structured JSON)
  // --------------------------------------------------------------------------
  describe('Document Content Persistence', () => {
    it('persists structured Tiptap JSON content containing headings, marks, and lists', async () => {
      await authService.signUp('author@example.com', 'Password123!', 'Author');
      const doc = await documentService.createDocument('Formatting Test Doc');

      const richContent = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Executive Summary' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'This text is ' },
              { type: 'text', marks: [{ type: 'bold' }], text: 'bold' },
              { type: 'text', text: ' and ' },
              { type: 'text', marks: [{ type: 'italic' }], text: 'italic' },
              { type: 'text', text: '.' },
            ],
          },
        ],
      };

      const updated = await documentService.updateDocument(doc.id, {
        content: richContent,
      });

      expect(updated.content).toEqual(richContent);

      // Verify reopening the document preserves exact structure
      const reopened = await documentService.getDocumentById(doc.id);
      expect(reopened.content).toEqual(richContent);
    });
  });

  // --------------------------------------------------------------------------
  // 3. File Import Validation & Parsing (.md & .txt)
  // --------------------------------------------------------------------------
  describe('File Import & Markdown Parser', () => {
    it('validates file extensions and rejects unsupported formats (e.g., .pdf, .docx)', () => {
      const pdfBlob = new Blob(['sample pdf content'], { type: 'application/pdf' });
      const pdfFile = new File([pdfBlob], 'report.pdf', { type: 'application/pdf' });

      const validation = fileImportService.validateFile(pdfFile);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('Only .md and .txt files are supported');
    });

    it('rejects empty files', () => {
      const emptyBlob = new Blob([''], { type: 'text/markdown' });
      const emptyFile = new File([emptyBlob], 'empty.md', { type: 'text/markdown' });

      const validation = fileImportService.validateFile(emptyFile);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('empty');
    });

    it('enforces maximum file size limit (2 MB)', () => {
      const largeContent = new Uint8Array(3 * 1024 * 1024);
      const largeBlob = new Blob([largeContent], { type: 'text/plain' });
      const largeFile = new File([largeBlob], 'giant.txt', { type: 'text/plain' });

      const validation = fileImportService.validateFile(largeFile);
      expect(validation.isValid).toBe(false);
      expect(validation.error).toContain('exceeds the 2 MB limit');
    });

    it('correctly parses Markdown headings, bold, italic, and lists into Tiptap JSON', () => {
      const markdown = `# Architecture Overview
This is **strong text** and *emphasized text*.

- Autonomous syncing
- Role-based permissions

1. First step
2. Second step`;

      const tiptapJson = fileImportService.markdownToTiptap(markdown);

      expect(tiptapJson.type).toBe('doc');
      expect(tiptapJson.content).toBeDefined();

      // Heading 1 check
      const headingNode = tiptapJson.content?.find(n => n.type === 'heading');
      expect(headingNode).toBeDefined();
      expect(headingNode?.attrs?.level).toBe(1);

      // Bullet list check
      const bulletList = tiptapJson.content?.find(n => n.type === 'bulletList');
      expect(bulletList).toBeDefined();

      // Ordered list check
      const orderedList = tiptapJson.content?.find(n => n.type === 'orderedList');
      expect(orderedList).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // 4. Document Sharing & Permission Enforcement
  // --------------------------------------------------------------------------
  describe('Document Sharing & Permissions', () => {
    it('allows document owner to share with another registered user as viewer or editor', async () => {
      const owner = await authService.signUp('owner@example.com', 'Password123!', 'Owner User');
      const collaborator = await authService.signUp('collab@example.com', 'Password123!', 'Collab User');

      // Switch to owner
      await authService.signIn('owner@example.com', 'Password123!');
      const doc = await documentService.createDocument('Collaborative Roadmap');

      // Share with collaborator as Editor
      const share = await sharingService.shareDocument(
        doc.id,
        'collab@example.com',
        'editor'
      );
      expect(share).toBeDefined();
      expect(share.permission).toBe('editor');
      expect(share.shared_with_user_id).toBe(collaborator.id);

      // Collaborator's effective permission is now 'editor'
      const collabPermission = await sharingService.getUserPermission(doc.id, collaborator.id);
      expect(collabPermission).toBe('editor');
    });

    it('prevents user from sharing document with themselves', async () => {
      await authService.signUp('self@example.com', 'Password123!', 'Self User');
      const doc = await documentService.createDocument('Solo Document');

      await expect(
        sharingService.shareDocument(doc.id, 'self@example.com', 'editor')
      ).rejects.toThrow('You cannot share a document with yourself');
    });

    it('enforces viewer-only restrictions: viewers cannot modify content or rename title', async () => {
      await authService.signUp('owner2@example.com', 'Password123!', 'Owner 2');
      const viewer = await authService.signUp('viewer2@example.com', 'Password123!', 'Viewer 2');

      // Owner creates doc and shares with viewer
      await authService.signIn('owner2@example.com', 'Password123!');
      const doc = await documentService.createDocument('Policy Handbook');
      await sharingService.shareDocument(doc.id, 'viewer2@example.com', 'viewer');

      // Switch to Viewer
      await authService.signIn('viewer2@example.com', 'Password123!');

      // Viewer can read the document
      const viewerDoc = await documentService.getDocumentById(doc.id);
      expect(viewerDoc).toBeDefined();
      expect(viewerDoc.permission).toBe('viewer');

      // Viewer tries to edit content -> must be rejected
      await expect(
        documentService.updateDocument(doc.id, {
          content: { type: 'doc', content: [{ type: 'paragraph' }] },
        })
      ).rejects.toThrow(/Viewers cannot modify/);

      // Viewer tries to rename document -> must be rejected
      await expect(
        documentService.updateDocument(doc.id, { title: 'Hacked Title' })
      ).rejects.toThrow();
    });

    it('enforces owner-only deletion: non-owners cannot delete documents', async () => {
      await authService.signUp('owner3@example.com', 'Password123!', 'Owner 3');
      await authService.signUp('other3@example.com', 'Password123!', 'Other 3');

      await authService.signIn('owner3@example.com', 'Password123!');
      const doc = await documentService.createDocument('Important Document');
      await sharingService.shareDocument(doc.id, 'other3@example.com', 'editor');

      // Other user tries to delete
      await authService.signIn('other3@example.com', 'Password123!');
      await expect(
        documentService.deleteDocument(doc.id)
      ).rejects.toThrow(/Only the document owner can delete/);
    });

    it('prevents unauthorized users from accessing private documents', async () => {
      await authService.signUp('owner4@example.com', 'Password123!', 'Owner 4');
      await authService.signUp('stranger4@example.com', 'Password123!', 'Stranger 4');

      await authService.signIn('owner4@example.com', 'Password123!');
      const privateDoc = await documentService.createDocument('Confidential Strategy');

      // Stranger attempts to fetch private document
      await authService.signIn('stranger4@example.com', 'Password123!');

      await expect(
        documentService.getDocumentById(privateDoc.id)
      ).rejects.toThrow(/Access denied|not have permission/);
    });

    it('allows owner to revoke share and immediately cuts off recipient access', async () => {
      const owner = await authService.signUp('owner5@example.com', 'Password123!', 'Owner 5');
      const collab = await authService.signUp('collab5@example.com', 'Password123!', 'Collab 5');

      await authService.signIn('owner5@example.com', 'Password123!');
      const doc = await documentService.createDocument('Temporary Sharing Doc');
      const share = await sharingService.shareDocument(doc.id, 'collab5@example.com', 'editor');

      // Verify collab currently has access
      let perm = await sharingService.getUserPermission(doc.id, collab.id);
      expect(perm).toBe('editor');

      // Revoke share
      await sharingService.revokeShare(share.id);

      // Verify collab has lost access
      perm = await sharingService.getUserPermission(doc.id, collab.id);
      expect(perm).toBeNull();
    });
  });
});
