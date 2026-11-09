-- ==============================================================================
-- COLLABDOCS DATABASE INITIAL MIGRATION
-- Project: CollabDocs (Ajaia LLC AI-Native Full Stack Developer Assessment)
-- Candidate: Abduljawwad Salihu
-- Database: Supabase PostgreSQL with Row Level Security (RLS)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
-- 1. Authenticated users can read all profiles (required for sharing autocomplete & collaborator lookups)
CREATE POLICY "Profiles are readable by authenticated users"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 3. Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- 2. DOCUMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Document',
    content JSONB NOT NULL DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON public.documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON public.documents(updated_at DESC);

-- ------------------------------------------------------------------------------
-- 3. DOCUMENT_SHARES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission TEXT NOT NULL CHECK (permission IN ('viewer', 'editor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_document_share UNIQUE (document_id, shared_with_user_id)
);

-- Enable RLS
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- Indexes for shares
CREATE INDEX IF NOT EXISTS idx_document_shares_doc_id ON public.document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_user_id ON public.document_shares(shared_with_user_id);

-- ------------------------------------------------------------------------------
-- 4. SECURITY DEFINER HELPER FUNCTIONS (Eliminates RLS Recursion)
-- ------------------------------------------------------------------------------

-- Check if current authenticated user owns the document
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

-- Check if user has access to document with required permission
CREATE OR REPLACE FUNCTION public.has_document_access(doc_id UUID, required_permission TEXT DEFAULT 'viewer')
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        -- Document owner has full access
        SELECT 1 FROM public.documents
        WHERE id = doc_id AND owner_id = auth.uid()
        UNION
        -- Or user has explicit share grant matching or exceeding required permission
        SELECT 1 FROM public.document_shares
        WHERE document_id = doc_id 
          AND shared_with_user_id = auth.uid()
          AND (
            required_permission = 'viewer' 
            OR (required_permission = 'editor' AND permission = 'editor')
          )
    );
$$;

-- ------------------------------------------------------------------------------
-- 5. DOCUMENTS ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------

-- SELECT: Document owner OR shared collaborator can view
CREATE POLICY "Users can view owned or shared documents"
    ON public.documents
    FOR SELECT
    TO authenticated
    USING (
        owner_id = auth.uid() 
        OR public.has_document_access(id, 'viewer')
    );

-- INSERT: Authenticated user can create document where owner_id is themselves
CREATE POLICY "Users can create their own documents"
    ON public.documents
    FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- UPDATE: Document owner OR shared editor can update content
CREATE POLICY "Owners and shared editors can update documents"
    ON public.documents
    FOR UPDATE
    TO authenticated
    USING (
        owner_id = auth.uid() 
        OR public.has_document_access(id, 'editor')
    )
    WITH CHECK (
        -- Prevent changing the document owner during update
        owner_id = (SELECT d.owner_id FROM public.documents d WHERE d.id = documents.id)
    );

-- DELETE: Only document owner can delete document
CREATE POLICY "Only owners can delete their documents"
    ON public.documents
    FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 6. DOCUMENT SHARES ROW LEVEL SECURITY POLICIES
-- ------------------------------------------------------------------------------

-- SELECT: Document owner can view all shares; recipient can view their own share
CREATE POLICY "Users can view shares for owned documents or shared with self"
    ON public.document_shares
    FOR SELECT
    TO authenticated
    USING (
        shared_with_user_id = auth.uid()
        OR public.is_document_owner(document_id)
    );

-- INSERT: Only document owner can create shares
CREATE POLICY "Only document owners can share documents"
    ON public.document_shares
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_document_owner(document_id));

-- UPDATE: Only document owner can update shares
CREATE POLICY "Only document owners can modify shares"
    ON public.document_shares
    FOR UPDATE
    TO authenticated
    USING (public.is_document_owner(document_id))
    WITH CHECK (public.is_document_owner(document_id));

-- DELETE: Only document owner can revoke shares (or recipient revoking self)
CREATE POLICY "Owners can revoke shares or recipients can leave"
    ON public.document_shares
    FOR DELETE
    TO authenticated
    USING (
        public.is_document_owner(document_id)
        OR shared_with_user_id = auth.uid()
    );

-- ------------------------------------------------------------------------------
-- 7. TRIGGERS AND AUTOMATION
-- ------------------------------------------------------------------------------

-- Trigger: Automatically update 'updated_at' column on document changes
CREATE OR REPLACE FUNCTION public.handle_document_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_document_updated_at ON public.documents;
CREATE TRIGGER trigger_document_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_document_updated_at();

-- Trigger: Automatically create public.profiles record when new auth.user is registered
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, created_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
