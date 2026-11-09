# CollabDocs — Assessment Submission Manifest

> **Ajaia LLC — AI-Native Full Stack Developer Assessment**  
> **Candidate Name:** Abduljawwad Salihu  
> **Candidate Email:** `salihuabduljawwad.a@gmail.com`  
> **Submission Date:** November 9, 2026  

---

## 1. Project Overview & Description

**CollabDocs** is a modern, responsive, collaborative document management and editing platform inspired by Google Docs and Notion. It empowers cross-functional teams to create, format, organize, import, and share rich-text documents with precision role-based access control (Viewer vs. Editor).

The application is engineered with a strict full-stack architecture: React 19, TypeScript, Vite, Tailwind CSS v4, Tiptap (ProseMirror engine), and Supabase (PostgreSQL 15+, Supabase Auth, and Row Level Security). It features a dual-mode persistence architecture allowing instant zero-config testing directly in the preview environment while fully supporting production Supabase connectivity.

---

## 2. Technology Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build System**: Vite 8.3
- **Styling**: Tailwind CSS v4 with custom ProseMirror document typography
- **Rich-Text Engine**: Tiptap Headless ProseMirror (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-text-align`, `@tiptap/extension-placeholder`)
- **Icons**: Lucide React
- **Database & Auth**: Supabase PostgreSQL 15+, GoTrue Auth, Row Level Security (RLS)
- **Local Persistence & RLS Simulation**: In-memory & `localStorage` PostgreSQL RLS simulation engine
- **Testing Framework**: Vitest
- **Hosting & Deployment**: Vercel (Frontend SPA) + Supabase (Database / Auth)

---

## 3. Implemented Features Checklist

Every mandatory feature specified in the assessment requirements has been fully implemented, verified, and tested:

- [x] **User Authentication**: Email/password registration, login, logout, and session survival across browser refreshes.
- [x] **Document Creation**: Unique UUID generation, title validation, owner assignment, and immediate database write.
- [x] **Document Renaming**: Owner-only inline and modal title editing with strict validation.
- [x] **Rich-Text Document Editing**: Headings (H1, H2), paragraphs, bold, italic, underline, bullet lists, ordered lists, text alignment, and undo/redo history.
- [x] **Document Saving & Persistence**: Structured JSONB document storage preserving formatting trees.
- [x] **Document Reopening**: Lossless re-hydration of existing documents.
- [x] **File Import (.md & .txt)**: Drag-and-drop file ingestion, 2 MB size enforcement, format validation, and AST conversion into Tiptap JSON.
- [x] **Document Sharing**: Collaborator lookup by email, role assignment (Viewer vs. Editor), and real-time collaborator list.
- [x] **Viewer vs. Editor Restrictions**: Viewers are locked into read-only mode with disabled toolbars; Editors can format content; Owners retain exclusive delete and rename privileges.
- [x] **Owned vs. Shared Document Separation**: Clear dashboard categorization with counts for My Documents and Shared With Me.
- [x] **Database Persistence & RLS**: Normalized schema (`profiles`, `documents`, `document_shares`), security definer helper functions, and non-recursive RLS policies.
- [x] **Input Validation & Error Handling**: Comprehensive validation for titles, passwords, file sizes, and network states with human-friendly error messages.
- [x] **Automated Testing**: 13/13 Vitest automated tests covering all critical service paths and security boundaries.
- [x] **Responsive SaaS UI**: Polished, accessible desktop, tablet, and mobile interface with professional empty states.
- [x] **Production Deployment Configuration**: `vercel.json` SPA rewrite rules and environment variable documentation.

### Partially Implemented Features
*None.* All mandatory requirements have been implemented end-to-end.

---

## 4. Automated Testing Results

Vitest test suite output (`npm test`):
```text
✓ tests/collabdocs.test.ts (13 tests) 27ms
  ✓ CollabDocs Core Service & Security Test Suite
    ✓ Document Creation & Title Validation
      ✓ creates a new document with owner assigned to active session (3ms)
      ✓ validates document title rules: rejects empty, whitespace-only, and oversized titles (1ms)
    ✓ Document Content Persistence
      ✓ persists structured Tiptap JSON content containing headings, marks, and lists (1ms)
    ✓ File Import & Markdown Parser
      ✓ validates file extensions and rejects unsupported formats (e.g., .pdf, .docx) (1ms)
      ✓ rejects empty files (1ms)
      ✓ enforces maximum file size limit (2 MB) (7ms)
      ✓ correctly parses Markdown headings, bold, italic, and lists into Tiptap JSON (1ms)
    ✓ Document Sharing & Permissions
      ✓ allows document owner to share with another registered user as viewer or editor (1ms)
      ✓ prevents user from sharing document with themselves (2ms)
      ✓ enforces viewer-only restrictions: viewers cannot modify content or rename title (9ms)
      ✓ enforces owner-only deletion: non-owners cannot delete documents (3ms)
      ✓ prevents unauthorized users from accessing private documents (4ms)
      ✓ allows owner to revoke share and immediately cuts off recipient access (1ms)

Test Files  1 passed (1)
Tests       13 passed (13)
Duration    384ms
```

---

## 5. Reviewer Test Account Instructions

The application operates without hardcoded dummy or fake demo accounts:

1. Any user can create their real profile via the **Create an Account** form on the login screen.
2. Users provide their full name, email, and password.
3. Once registered, users can create documents, edit rich text, import `.md` and `.txt` files, and share documents with any other registered user by email.

---

## 6. Project URLs & Deliverables

- **Live Deployed Application URL**: `https://ais-dev-nifwa2j5nkpvruxjri36xs-199249470969.europe-west2.run.app`
- **Source Code Location**: Current repository root
- **Video Walkthrough URL**: `[WALKTHROUGH_VIDEO_URL_PLACEHOLDER]` *(To be added upon recording)*

### Documentation Inventory
- `README.md` — Complete project overview, prerequisites, setup commands, and troubleshooting.
- `docs/SETUP_AND_RUN.md` — Detailed step-by-step installation, Supabase setup, migrations, and Vercel deployment guide.
- `docs/ARCHITECTURE.md` — System architecture, Mermaid sequence and ER diagrams, autosave lifecycle.
- `docs/DATABASE.md` — Database tables, indexes, triggers, and Row Level Security definitions.
- `docs/SECURITY.md` — Threat model, defense-in-depth, input sanitization, and RLS specifications.
- `docs/USER_GUIDE.md` — Non-technical manual with step-by-step usage instructions.
- `docs/AI_WORKFLOW.md` — AI collaboration methodology, engineering decisions, and reviewed suggestions.
- `supabase/migrations/20240101000000_initial_schema.sql` — PostgreSQL migration script.
- `supabase/seed.sql` — Sample data documentation.
- `tests/collabdocs.test.ts` — Vitest automated test suite.

---

## 7. Known Scope Limitations

As specified in the assessment boundaries:
- Real-time character-by-character live co-presence (Google Docs-style operational transformation / WebRTC) was intentionally excluded. Document synchronization is authoritative and debounced at 800–1200ms.
- Invitation workflows for unregistered external emails are simplified: sharing is performed against registered user profiles.

---

## 8. What Could Be Built With an Additional 2–4 Hours

1. **Version History & Document Snapshots**: Add a snapshot table to store document state at each manual save point, enabling side-by-side visual diffing and point-in-time restoration.
2. **Export Capabilities**: Export documents to PDF and downloadable `.md` files directly from the editor.
3. **Document Comments**: Inline comment threads on selected text ranges with resolution tracking.
4. **Presence Indicators**: Lightweight presence heartbeat showing active readers/editors currently viewing a document.
