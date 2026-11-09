# CollabDocs — Setup and Execution Guide

> **Ajaia LLC — AI-Native Full Stack Developer Assessment**  
> **Candidate:** Abduljawwad Salihu  
> **Platform:** CollabDocs (Document Management & Editing Platform)  

This guide provides step-by-step instructions for installing, configuring, running, testing, and deploying CollabDocs on your local machine or in production.

---

## Table of Contents
1. [Quick Start (Under 60 Seconds)](#1-quick-start-under-60-seconds)
2. [Prerequisites & System Requirements](#2-prerequisites--system-requirements)
3. [Installation Step-by-Step](#3-installation-step-by-step)
4. [Choosing Your Execution Mode](#4-choosing-your-execution-mode)
   - [Mode A: Zero-Config Local Mode (Instant, No Accounts Needed)](#mode-a-zero-config-local-mode-recommended-for-quick-eval)
   - [Mode B: Live Supabase PostgreSQL Mode](#mode-b-live-supabase-postgresql-mode)
5. [Running the Application](#5-running-the-application)
6. [Running the Automated Test Suite](#6-running-the-automated-test-suite)
7. [Building for Production & Previewing](#7-building-for-production--previewing)
8. [Deploying to Vercel](#8-deploying-to-vercel)
9. [Troubleshooting Common Issues](#9-troubleshooting-common-issues)

---

## 1. Quick Start (Under 60 Seconds)

If you have Node.js (v18+) and npm installed, you can launch CollabDocs immediately without configuring any external API keys:

```bash
# 1. Clone the repository
git clone https://github.com/your-username/collabdocs.git
cd collabdocs

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.  
Click **"Create an Account"** on the login screen to register your profile and start writing!

---

## 2. Prerequisites & System Requirements

Before starting, ensure your workstation meets the following minimum requirements:

- **Node.js**: `v18.0.0` or higher (`v20+` LTS recommended). Verify with:
  ```bash
  node -v
  ```
- **npm**: `v9.0.0` or higher. Verify with:
  ```bash
  npm -v
  ```
- **Git**: Installed and configured.
- **Web Browser**: Modern browser with ES2022 support (Chrome, Firefox, Safari, Edge).
- **Supabase Account (Optional)**: Only required if you wish to run against a remote PostgreSQL database rather than the local engine. A free account can be created at [supabase.com](https://supabase.com).

---

## 3. Installation Step-by-Step

### Step 3.1: Clone the Codebase
```bash
git clone https://github.com/your-username/collabdocs.git
cd collabdocs
```

### Step 3.2: Install Dependencies
Install all required runtime and build dependencies using npm:
```bash
npm install
```

This installs:
- Core UI: `react`, `react-dom`, `lucide-react`, `motion`
- Rich-Text Editor: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-text-align`, `@tiptap/extension-placeholder`
- Cloud Infrastructure: `@supabase/supabase-js`
- Build & Style Tools: `vite`, `@tailwindcss/vite`, `tailwindcss`, `typescript`
- Testing Engine: `vitest`

---

## 4. Choosing Your Execution Mode

CollabDocs is engineered with an intelligent **dual-mode persistence architecture**. You can choose whichever mode best fits your evaluation or production needs:

### Mode A: Zero-Config Local Mode (Recommended for Quick Eval)
- **Requirements**: None! No external accounts, no API keys, no network setup.
- **How it works**: The app uses a built-in persistent local database simulator that faithfully enforces PostgreSQL schema, unique constraints, and Row Level Security (RLS) rules in browser storage.
- **How to activate**:
  Simply start the app with an empty `.env` or without `VITE_SUPABASE_URL`. The app detects the absence of credentials and boots into Local Mode automatically.

### Mode B: Live Supabase PostgreSQL Mode
Use this mode to connect CollabDocs to a real remote PostgreSQL database with Supabase GoTrue Auth and server-enforced RLS policies.

#### Step B.1: Create a Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose a name (e.g., `collabdocs-prod`), set a secure database password, and select a region close to you.
4. Click **Create new project** and wait ~2 minutes for provisioning.

#### Step B.2: Execute the Database Migration
1. In your Supabase project dashboard, navigate to the **SQL Editor** (icon on the left navigation bar).
2. Click **New Query**.
3. Open the migration file in this repository:
   `supabase/migrations/20240101000000_initial_schema.sql`
4. Copy the entire contents of the file, paste it into the Supabase SQL Editor, and click **Run**.
5. You should see `Success. No rows returned`. This creates:
   - `public.profiles` table and policies
   - `public.documents` table, indexes, and RLS policies
   - `public.document_shares` table and constraints
   - Security Definer functions (`is_document_owner`, `has_document_access`)
   - Triggers for user profile creation (`on_auth_user_created`) and timestamps (`trigger_document_updated_at`)

#### Step B.3: Configure Supabase Auth Settings (Recommended for Dev)
1. In the Supabase Dashboard, go to **Authentication** -> **Providers** -> **Email**.
2. For local testing without verifying emails, disable **"Confirm email"** (toggle it off). This allows newly registered users to sign in immediately without clicking an email confirmation link.

#### Step B.4: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Open `.env` in your code editor and populate your Supabase project values:
```env
# Supabase Project URL (from Supabase Project Settings -> API)
VITE_SUPABASE_URL="https://your-project-id.supabase.co"

# Supabase Anon Public Key (from Supabase Project Settings -> API)
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Application URL
APP_URL="http://localhost:3000"
```

*(Note: You can also enter and switch Supabase credentials directly in the running application at any time by clicking the **"Database Status"** pill in the top navigation bar!)*

---

## 5. Running the Application

### Start Development Server
```bash
npm run dev
```

Output:
```text
  VITE v8.3.x  ready in 180 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### User Onboarding Walkthrough
1. **Register**: On the login screen, click **"Create an Account"**. Enter your name, email, and password.
2. **Dashboard**: You will be redirected to your personal workspace.
3. **Create a Document**: Click **"Create Document"** in the sidebar or header, enter a title, and begin formatting.
4. **Formatting**: Use the toolbar or shortcuts:
   - `Ctrl+B` / `Cmd+B` for Bold
   - `Ctrl+I` / `Cmd+I` for Italic
   - `Ctrl+U` / `Cmd+U` for Underline
   - `Ctrl+S` / `Cmd+S` for Manual Save
5. **Autosave**: Edits are automatically saved after a 1000ms pause. Observe the **"Saved"** indicator in the top header.
6. **Import**: On the dashboard, click **"Import .md / .txt"** to drag-and-drop any Markdown or plain text document up to 2 MB.
7. **Share**: Inside any document you own, click **"Share"**, enter a colleague's registered email, select **"Editor"** or **"Viewer"**, and click **Share**.

---

## 6. Running the Automated Test Suite

CollabDocs includes an automated integration test suite built with **Vitest**. It exercises all core document lifecycle behaviors, title validations, Markdown parsing, and RLS sharing permissions.

```bash
# Run all tests once
npm test
```

### Expected Output:
```text
 ✓ tests/collabdocs.test.ts (13 tests) 27ms
   ✓ CollabDocs Core Service & Security Test Suite
     ✓ User Profile & Document Creation
       ✓ allows a user to create a real profile and create documents
       ✓ validates document title rules: rejects empty, whitespace-only, and oversized titles
     ✓ Document Content Persistence
       ✓ persists structured Tiptap JSON content containing headings, marks, and lists
     ✓ File Import & Markdown Parser
       ✓ validates file extensions and rejects unsupported formats (e.g., .pdf, .docx)
       ✓ rejects empty files
       ✓ enforces maximum file size limit (2 MB)
       ✓ correctly parses Markdown headings, bold, italic, and lists into Tiptap JSON
     ✓ Document Sharing & Permissions
       ✓ allows document owner to share with another registered user as viewer or editor
       ✓ prevents user from sharing document with themselves
       ✓ enforces viewer-only restrictions: viewers cannot modify content or rename title
       ✓ enforces owner-only deletion: non-owners cannot delete documents
       ✓ prevents unauthorized users from accessing private documents
       ✓ allows owner to revoke share and immediately cuts off recipient access

Test Files  1 passed (1)
Tests       13 passed (13)
```

### Static Type Check / Linting
```bash
npm run lint
```
Runs `tsc --noEmit` across the entire codebase to verify strict TypeScript adherence with zero type errors.

---

## 7. Building for Production & Previewing

### Create Optimized Production Build
```bash
npm run build
```
This compiles and bundles all TypeScript and React assets into the `dist/` directory using Vite.

### Preview Production Build Locally
```bash
npm run preview
```
Serves the generated `dist/` bundle on `http://localhost:4173` to test production asset loading and routing.

---

## 8. Deploying to Vercel

CollabDocs is pre-configured for one-click deployment on **Vercel** with full client-side SPA routing (`vercel.json`).

### Deploy via Vercel CLI
```bash
# 1. Install Vercel CLI (if not already installed)
npm install -g vercel

# 2. Deploy from the project root
vercel
```

### Deploy via Vercel Web Dashboard
1. Push your repository to GitHub or GitLab.
2. In the [Vercel Dashboard](https://vercel.com/new), click **Add New...** -> **Project**.
3. Import your repository.
4. Framework Preset: **Vite**.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. **Environment Variables**: Add the following under Project Settings:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key
8. Click **Deploy**.

Vercel will build and serve your app globally with edge routing defined in `vercel.json`.

---

## 9. Troubleshooting Common Issues

### Issue 1: "Access Denied: You do not have permission to view this document"
- **Cause**: The document ID requested in the URL belongs to another user and has not been shared with the current logged-in user.
- **Resolution**: Log in with the account of the document owner or have the owner share the document with your email address.

### Issue 2: Supabase connection fails or returns "Failed to fetch"
- **Cause**: Invalid Supabase URL or Anon key, or CORS / network restrictions.
- **Resolution**:
  1. Click the **"Database Status"** pill in the top navigation bar.
  2. Verify that your Supabase URL starts with `https://` and has no trailing slash.
  3. Verify that you pasted the `anon` public key (not the `service_role` key).
  4. Alternatively, click **"Local Storage Mode"** to switch to the local database immediately.

### Issue 3: Newly registered user cannot log in on Supabase
- **Cause**: Supabase project has email confirmation enabled, but the user has not clicked the confirmation link.
- **Resolution**: In the Supabase dashboard, go to **Authentication** -> **Providers** -> **Email** and uncheck **"Confirm email"** for development, or check the user's inbox to confirm the account.

### Issue 4: File upload rejected with "Unsupported file format"
- **Cause**: Uploading a file format other than `.md`, `.markdown`, or `.txt`.
- **Resolution**: CollabDocs supports Markdown and plain text files up to 2 MB. Convert documents to `.md` or `.txt` before uploading.
