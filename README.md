# CollabDocs — Collaborative Document Management & Editing Platform

> **Ajaia LLC — AI-Native Full Stack Developer Assessment**  
> **Candidate:** Abduljawwad Salihu  
> **Repository Status:** Production-Ready MVP  
> **Technology Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Tiptap, Supabase (PostgreSQL + Auth + RLS), Vitest

---

## 1. Project Introduction

**CollabDocs** is a lightweight, high-performance collaborative document management and rich-text editing workspace inspired by Google Docs and modern productivity tools. Built specifically for cross-functional teams, it provides a clean, distraction-free writing environment coupled with robust database persistence, role-based sharing permissions (Viewer vs. Editor), and seamless document ingestion for Markdown (`.md`) and plain text (`.txt`) files.

### The Problem It Solves
Traditional word processors are heavy, clunky, and often couple document editing with complex, opaque file formats. CollabDocs demonstrates that modern web standards, structured JSON document schemas, and database-level Row Level Security (RLS) can deliver a secure, responsive, and intuitive writing and document collaboration experience without unnecessary overhead.

### Key Capabilities
- **Rich-Text Document Authoring**: Powered by Tiptap headless ProseMirror engine with headings, bold, italic, underline, lists, alignment, quote blocks, code blocks, and undo/redo history.
- **Structured JSONB Persistence**: Documents are stored as structured JSON syntax trees rather than dangerous raw HTML strings, preventing XSS injection and formatting decay.
- **Dual-State Backend Architecture**:
  - **Live Supabase Mode**: Connects directly to remote Supabase PostgreSQL, Supabase Authentication, and Row Level Security.
  - **Local Test DB / Offline Mode**: Instant zero-friction evaluation mode with complete in-memory and persistent `localStorage` PostgreSQL & RLS simulation, allowing reviewers to evaluate multi-user sharing in one click without configuring external API keys.
- **Granular Document Sharing & RBAC**:
  - **Owner**: Full administrative control (editing, renaming, sharing, collaborator role management, permanent deletion).
  - **Editor**: Can view and modify content; cannot rename, delete, or re-assign ownership.
  - **Viewer**: Read-only access with disabled formatting tools and protected document canvas.
- **Bidirectional File Ingestion**: Upload `.md` or `.txt` files up to 2 MB with automatic AST parsing into Tiptap JSON nodes.
- **Resilient Debounced Autosave**: Automatic background saving with an 800–1200ms debounce interval, visual status badges (`Saved`, `Saving...`, `Unsaved changes`, `Save failed`), and race condition prevention.

---

## 2. Feature Inventory

| Feature | Implementation Status | Verification Details |
|---|---|---|
| **User Authentication** | Complete | Email/password sign-up, sign-in, session persistence, automatic profile creation trigger |
| **Document Creation** | Complete | Unique UUID generation, title validation, owner assignment, immediate database write |
| **Document Renaming** | Complete | Owner-only permission check, real-time title validation, inline & modal editing |
| **Rich-Text Editing** | Complete | Tiptap StarterKit, Underline, TextAlign, Placeholder, custom toolbar with active states |
| **Structured Document Saving** | Complete | Structured JSONB serialization preserving all marks, headings, and lists |
| **Autosave Engine** | Complete | Debounced 1000ms delay, race condition guard, manual save button (Ctrl+S / Cmd+S) |
| **Document Reopening** | Complete | Re-hydrates exact document hierarchy and formatted state |
| **File Import (.md / .txt)** | Complete | Drag-and-drop / file picker, 2MB limit check, MIME validation, Markdown AST parser |
| **Document Sharing** | Complete | Share dialog, collaborator email lookup, role selector, revoke access button |
| **Role Separation (Viewer vs Editor)**| Complete | Viewers are locked into read-only mode; Editors have full formatting access |
| **Owned vs Shared Separation** | Complete | Dashboard displays distinct sections with counts for My Documents and Shared With Me |
| **Database Persistence & RLS** | Complete | PostgreSQL schema, Row Level Security policies, indexes, and automated triggers |
| **Automated Testing** | Complete | 13/13 automated unit & integration tests passing with Vitest |
| **Responsive SaaS UI** | Complete | Desktop, tablet, and mobile optimized layouts using Tailwind CSS v4 |
| **Production Build & Deployment**| Complete | Clean Vite production build with Vercel SPA configuration (`vercel.json`) |

---

## 3. System Requirements & Prerequisites

### System Requirements
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Package Manager**: npm v9.0.0 or higher
- **Operating System**: macOS, Linux, or Windows (WSL2 recommended)
- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge (ES2022 support)

### Prerequisites
1. Free [Supabase Account](https://supabase.com) (Optional for local testing; required for remote PostgreSQL deployment).
2. [Vercel Account](https://vercel.com) (for live hosting).

---

## 4. Installation & Local Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/collabdocs.git
cd collabdocs
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

If connecting to a live Supabase project, supply your credentials:
```env
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"
```
*(If left blank, CollabDocs automatically boots into **Local Storage Mode** with full RLS simulation, allowing any user to register a real profile immediately without configuring external API keys!)*

> 📖 **Looking for comprehensive instructions?** See the full [**Setup & Execution Guide (docs/SETUP_AND_RUN.md)**](docs/SETUP_AND_RUN.md) for detailed Supabase configuration, migrations, testing, and Vercel deployment.

### Step 4: Execute Database Migrations (Supabase Users)
If using Supabase, copy the contents of `supabase/migrations/20240101000000_initial_schema.sql` and run it in the **Supabase SQL Editor**.

### Step 5: Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Running Tests & Code Quality

```bash
# Run Vitest test suite
npm test

# Run TypeScript static type check
npm run lint

# Create production build
npm run build

# Preview production build locally
npm run preview
```

---

## 6. User Account Registration & Authentication

CollabDocs operates without hardcoded dummy users or sample placeholder documents. Every user can register a real profile directly through the interface:

1. Click **Create an Account** on the login screen.
2. Enter your **Full Name**, **Work Email**, and choose a secure **Password** (min 6 characters).
3. Upon registration, your profile is immediately initialized in the database.
4. From your clean workspace, you can create new documents, import Markdown/TXT files, and share documents with teammates by entering their registered email addresses.

---

## 7. Troubleshooting

- **Error: "Access Denied: You do not have permission to view this document"**:
  Occurs when an unauthorized user attempts to open a private document ID directly via URL hash. Switch to the document owner or an authorized collaborator account.
- **Autosave shows "Unsaved changes"**:
  Check your network connection or verify that Supabase credentials in the database modal are valid. You can click the "Save" button or press `Ctrl+S` to force an immediate save.
- **File Upload Rejected**:
  Ensure the uploaded file has a `.md`, `.markdown`, or `.txt` extension and is under 2 MB in size.

---

## 8. Project Structure

```text
collabdocs/
├── src/
│   ├── components/
│   │   ├── common/           # Navbar, Modal, DatabaseConfigModal
│   │   ├── documents/        # DocumentCard, Modals (Create, Rename, Import, Share)
│   │   └── editor/           # TiptapEditor, EditorToolbar, EditorHeader
│   ├── lib/
│   │   ├── supabase.ts       # Supabase client singleton & configuration manager
│   │   └── localDatabase.ts  # Persistent RLS-compliant local database simulator
│   ├── pages/
│   │   ├── Login.tsx         # User authentication with reviewer quick-sign-in
│   │   ├── Register.tsx      # User registration form
│   │   ├── Dashboard.tsx     # Main dashboard (My Documents vs Shared with Me)
│   │   └── DocumentEditorPage.tsx # Focused writing environment
│   ├── services/
│   │   ├── authService.ts    # Authentication & profile queries
│   │   ├── documentService.ts# Document CRUD & ownership rules
│   │   ├── sharingService.ts # Collaborator permissions & role grants
│   │   └── fileImportService.ts # File validation & Markdown/TXT AST parser
│   ├── types/
│   │   └── index.ts          # TypeScript domain models
│   ├── App.tsx               # Root component with routing and session listener
│   ├── main.tsx              # Application entry point
│   └── index.css             # Tailwind CSS & ProseMirror typography
├── supabase/
│   ├── migrations/           # Version-controlled SQL migration
│   └── seed.sql              # Database seed data
├── tests/
│   └── collabdocs.test.ts    # Vitest automated test suite (13 tests)
├── docs/
│   ├── ARCHITECTURE.md       # Detailed system design & Mermaid diagrams
│   ├── DATABASE.md           # Database schema, triggers, and RLS specifications
│   ├── SECURITY.md           # Security model & RLS authorization rules
│   ├── USER_GUIDE.md         # End-user instruction manual
│   └── AI_WORKFLOW.md        # AI collaboration process & engineering decisions
├── SUBMISSION.md             # Formal Ajaia LLC assessment manifest
├── vercel.json               # Vercel SPA routing configuration
├── package.json
└── vite.config.ts
```
