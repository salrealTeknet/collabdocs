# CollabDocs — Security & Access Control Architecture

> **Ajaia LLC — AI-Native Full Stack Developer Assessment**  
> **Candidate:** Abduljawwad Salihu  
> **Classification:** Security Specification  

---

## 1. Security Philosophy: Multi-Tiered Defense

CollabDocs enforces a defense-in-depth model where security is not trusted to frontend client code alone. All access decisions and data mutations are strictly validated across three distinct tiers:

1. **Client Tier (Presentation & Interaction)**: Form validation, UI permission badges, conditional edit states, read-only canvas locks.
2. **Service Tier (Application Logic)**: Input sanitization, MIME-type checks, payload limits, pre-flight authorization guards.
3. **Database Tier (PostgreSQL RLS — Authoritative)**: Cryptographic Row Level Security policies evaluated directly by the PostgreSQL engine on every SQL query.

---

## 2. Authentication & Session Management

- **Supabase GoTrue Engine**: Uses industry-standard JWTs (JSON Web Tokens) with asymmetric signatures.
- **Session Lifecycles**: Tokens are automatically refreshed prior to expiration.
- **Credential Storage**: Passwords are never stored or transmitted in plain text. Remote Supabase instances hash passwords using bcrypt/Argon2.
- **No Service-Role Key Leakage**: Browser code only ever receives public anon keys (`VITE_SUPABASE_ANON_KEY`). Service-role administrative keys are never bundled into client distributions.

---

## 3. Authorization & Role-Based Access Control (RBAC)

CollabDocs provides three distinct access tiers for documents:

| Capability | Document Owner | Shared Editor | Shared Viewer | Unauthorized User |
|---|---|---|---|---|
| **View Document** | Allowed | Allowed | Allowed | Denied (403/RLS) |
| **Edit Content** | Allowed | Allowed | Denied (Read-only) | Denied |
| **Rename Title** | Allowed | Denied | Denied | Denied |
| **Share Document** | Allowed | Denied | Denied | Denied |
| **Manage Collaborator Roles** | Allowed | Denied | Denied | Denied |
| **Delete Document** | Allowed | Denied | Denied | Denied |

### 3.1 Non-Owner Renaming Prevention
Even if a shared editor attempts to send a title update in a payload, the database policy and service layer reject it:
```sql
CREATE POLICY "Owners and shared editors can update documents"
    ON public.documents
    FOR UPDATE
    TO authenticated
    USING (
        owner_id = auth.uid() 
        OR public.has_document_access(id, 'editor')
    )
    WITH CHECK (
        owner_id = (SELECT d.owner_id FROM public.documents d WHERE d.id = documents.id)
    );
```
Furthermore, the `documentService.updateDocument` method validates that `updates.title` is only permitted when `permission === 'owner'`.

---

## 4. Row Level Security (RLS) Implementation Details

### Preventing RLS Policy Recursion
A frequent flaw in document sharing architectures is circular policy evaluation (e.g., checking `documents` inside `document_shares` policy, which in turn checks `documents`). CollabDocs eliminates recursion by utilizing PostgreSQL `SECURITY DEFINER` functions:

- `public.is_document_owner(doc_id UUID)`: Queries `documents` with elevated table privileges to check ownership.
- `public.has_document_access(doc_id UUID, required_permission TEXT)`: Performs a unified union query across ownership and shares without triggering nested RLS loops.

Both functions set an explicit `SET search_path = public` to prevent search-path hijacking.

---

## 5. Input Validation & Content Sanitization

1. **Title Validation**:
   - Rejects empty strings and whitespace-only submissions.
   - Enforces a strict 150-character maximum.
2. **File Import Security**:
   - Validates file extensions (`.md`, `.markdown`, `.txt`).
   - Validates file size against a 2 MB ceiling (`MAX_FILE_SIZE = 2 * 1024 * 1024`).
   - Text is parsed into an abstract syntax tree (AST) producing typed ProseMirror JSON nodes, neutralizing raw HTML/script tag injection vectors.
3. **Structured JSON Storage**:
   - Storing content in PostgreSQL `JSONB` guarantees that raw `<script>` tags cannot be stored as executable DOM elements.

---

## 6. Known Scope Limitations & Future Hardening

- **End-to-End Encryption (E2EE)**: Documents are encrypted in transit (TLS 1.3) and at rest (PostgreSQL disk encryption), but client-side asymmetric zero-knowledge document encryption is not implemented in this MVP.
- **Invitation Tokens**: In this version, documents can only be shared with registered emails; email invitation links for unregistered users are planned for future phases.
