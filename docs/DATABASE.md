# CollabDocs — Database Architecture & Schema Specification

> **Ajaia LLC — AI-Native Full Stack Developer Assessment**  
> **Candidate:** Abduljawwad Salihu  
> **Database Engine:** PostgreSQL 15+ (Supabase)

---

## 1. Overview

CollabDocs utilizes a normalized, relational database schema deployed on PostgreSQL via Supabase. The schema enforces data integrity through foreign key cascades, unique constraints, updated_at triggers, and database-level Row Level Security (RLS) policies.

---

## 2. Table Specifications

### 2.1 Table: `public.profiles`
Stores extended user profile information linked directly to Supabase Authentication (`auth.users`).

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY, REFERENCES auth.users(id) ON DELETE CASCADE` | Matches Supabase Auth user UUID |
| `full_name` | `TEXT` | `NULLABLE` | Display name of the user |
| `email` | `TEXT` | `NOT NULL` | Registered email address (used for collaborator lookups) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT timezone('utc'::text, now())` | Account creation timestamp |

#### RLS Policies on `profiles`:
- **SELECT**: All authenticated users can read all profiles (`auth.role() = 'authenticated'`). This is necessary to resolve collaborator names and emails during document sharing.
- **INSERT / UPDATE**: Users can only insert or update their own profile record (`auth.uid() = id`).

---

### 2.2 Table: `public.documents`
Stores document metadata and rich-text content in structured JSONB format.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique document identifier |
| `owner_id` | `UUID` | `NOT NULL, REFERENCES public.profiles(id) ON DELETE CASCADE` | Creator and owner of the document |
| `title` | `TEXT` | `NOT NULL, DEFAULT 'Untitled Document'` | Document title (max 150 chars) |
| `content` | `JSONB` | `NOT NULL, DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb` | Tiptap/ProseMirror structured document tree |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT timezone('utc'::text, now())` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT timezone('utc'::text, now())` | Automatically updated on every modification |

#### Indexes on `documents`:
- `CREATE INDEX idx_documents_owner_id ON public.documents(owner_id);`
- `CREATE INDEX idx_documents_updated_at ON public.documents(updated_at DESC);`

#### RLS Policies on `documents`:
- **SELECT**: Allowed if user is the owner (`owner_id = auth.uid()`) OR user has at least 'viewer' permission in `document_shares`.
- **INSERT**: Allowed only if `owner_id = auth.uid()`.
- **UPDATE**: Allowed if user is owner (`owner_id = auth.uid()`) OR has 'editor' permission in `document_shares`. Non-owners cannot alter `owner_id`.
- **DELETE**: Allowed only if user is owner (`owner_id = auth.uid()`). Shared editors and viewers cannot delete documents.

---

### 2.3 Table: `public.document_shares`
Defines role-based sharing permissions granted by document owners to collaborators.

| Column | Data Type | Constraints | Description |
|---|---|---|---|
| `id` | `UUID` | `PRIMARY KEY, DEFAULT gen_random_uuid()` | Unique share grant identifier |
| `document_id` | `UUID` | `NOT NULL, REFERENCES public.documents(id) ON DELETE CASCADE` | Associated document |
| `shared_with_user_id` | `UUID` | `NOT NULL, REFERENCES public.profiles(id) ON DELETE CASCADE` | Collaborator profile UUID |
| `permission` | `TEXT` | `NOT NULL, CHECK (permission IN ('viewer', 'editor'))` | Access level granted |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT timezone('utc'::text, now())` | Timestamp share was granted |

#### Constraints & Indexes:
- `CONSTRAINT unique_document_share UNIQUE (document_id, shared_with_user_id)` — Prevents duplicate share records for the same document and recipient.
- `CREATE INDEX idx_document_shares_doc_id ON public.document_shares(document_id);`
- `CREATE INDEX idx_document_shares_user_id ON public.document_shares(shared_with_user_id);`

#### RLS Policies on `document_shares`:
- **SELECT**: Document owner OR the shared recipient (`shared_with_user_id = auth.uid()`).
- **INSERT / UPDATE**: Document owner only (`is_document_owner(document_id)`).
- **DELETE**: Document owner (revoke access) OR the recipient (remove self).

---

## 3. Database Functions & Triggers

### 3.1 Security Definer Functions (Eliminating RLS Recursion)
To evaluate cross-table ownership without triggering infinite recursive RLS policy evaluations, PostgreSQL functions are declared with `SECURITY DEFINER` and an explicit `search_path`:

```sql
CREATE OR REPLACE FUNCTION public.is_document_owner(doc_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.documents
        WHERE id = doc_id AND owner_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.has_document_access(doc_id UUID, required_permission TEXT DEFAULT 'viewer')
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.documents
        WHERE id = doc_id AND owner_id = auth.uid()
        UNION
        SELECT 1 FROM public.document_shares
        WHERE document_id = doc_id 
          AND shared_with_user_id = auth.uid()
          AND (
            required_permission = 'viewer' 
            OR (required_permission = 'editor' AND permission = 'editor')
          )
    );
$$;
```

### 3.2 Automated Triggers
1. **`trigger_document_updated_at`**:
   Automatically sets `NEW.updated_at = timezone('utc'::text, now())` before any `UPDATE` on `public.documents`.
2. **`on_auth_user_created`**:
   Listens to new user sign-ups on `auth.users` and automatically creates a corresponding row in `public.profiles`.

---

## 4. Migration Execution

The complete database schema migration is stored in:
`/supabase/migrations/20240101000000_initial_schema.sql`

To apply in Supabase:
1. Open the [Supabase Dashboard](https://app.supabase.com).
2. Navigate to your project -> **SQL Editor**.
3. Paste the contents of the migration file and click **Run**.
