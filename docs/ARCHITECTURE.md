# CollabDocs — Architectural Specification

> **Ajaia LLC — AI-Native Full Stack Developer Assessment**  
> **Candidate:** Abduljawwad Salihu  
> **Document Status:** Approved Architecture  

---

## 1. System Overview

CollabDocs is an enterprise-grade, lightweight collaborative document editing and management platform. It combines a modern headless rich-text editing engine (Tiptap / ProseMirror) with a normalized relational database (Supabase PostgreSQL) protected by database-level Row Level Security (RLS) policies.

The system is designed with a **clean separation of concerns**:
- **Presentation Layer (React + Tailwind CSS v4)**: Reactive UI components, state management, and accessible modals.
- **Rich-Text Engine (Tiptap / ProseMirror)**: Structured JSON syntax trees representing document headings, paragraphs, lists, and inline marks.
- **Domain Service Layer**: Stateless TypeScript services handling authentication, document CRUD, file ingestion, and sharing logic.
- **Data Persistence Layer**: Dual-mode engine supporting remote Supabase PostgreSQL and an in-memory/persistent local database with strict RLS parity.

---

## 2. System Architecture Diagram

```mermaid
graph TD
    Client[Web Browser / React 19 Client] -->|HTTP / WebSocket| CDN[Vercel Edge Network]
    Client -->|Auth / SQL / RLS| Supabase[Supabase Managed Backend]
    
    subgraph Frontend Architecture
        Router[Hash Router & Route Guard]
        UI[Tailwind UI & Modals]
        Editor[Tiptap Rich-Text Engine]
        Services[Service Layer: Auth, Docs, Sharing, Import]
        State[Dual-Storage Manager: Supabase / LocalDB]
        
        Router --> UI
        UI --> Editor
        UI --> Services
        Services --> State
    end
    
    subgraph Supabase Infrastructure
        AuthServer[Supabase GoTrue Auth]
        Postgres[PostgreSQL 15+]
        RLS[Row Level Security Engine]
        
        AuthServer --> Postgres
        RLS --> Postgres
    end

    State -->|Remote Mode| AuthServer
    State -->|Remote Mode| Postgres
```

---

## 3. Database Architecture & ER Diagram

The database utilizes three core entities: `profiles`, `documents`, and `document_shares`.

```mermaid
erDiagram
    PROFILES ||--o{ DOCUMENTS : "owns"
    PROFILES ||--o{ DOCUMENT_SHARES : "collaborates"
    DOCUMENTS ||--o{ DOCUMENT_SHARES : "shared_via"

    PROFILES {
        uuid id PK "References auth.users"
        text full_name "User display name"
        text email "Registered email"
        timestamptz created_at "Registration timestamp"
    }

    DOCUMENTS {
        uuid id PK "Random UUID v4"
        uuid owner_id FK "References profiles.id"
        text title "Document title (NOT NULL)"
        jsonb content "Tiptap Structured JSON tree"
        timestamptz created_at "Creation timestamp"
        timestamptz updated_at "Last modified timestamp"
    }

    DOCUMENT_SHARES {
        uuid id PK "Random UUID v4"
        uuid document_id FK "References documents.id"
        uuid shared_with_user_id FK "References profiles.id"
        text permission "viewer OR editor"
        timestamptz created_at "Shared timestamp"
    }
```

---

## 4. Document Editing & Autosave Lifecycle

The autosave pipeline guarantees responsiveness while preventing data loss and race conditions:

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Editor / Owner)
    participant UI as Tiptap Editor
    participant Debounce as Autosave Timer (1000ms)
    participant Service as DocumentService
    participant DB as PostgreSQL / LocalDB

    User->>UI: Types or formats text
    UI->>UI: Updates local ProseMirror document model
    UI->>Debounce: Reset & start debounce timer (1000ms)
    UI-->>User: Status: "Unsaved changes"
    
    Note over Debounce: User pauses typing...
    Debounce->>Service: trigger executeSave(jsonContent)
    Service->>Service: Set isSaving = true
    Service-->>User: Status: "Saving..."
    
    Service->>DB: UPDATE documents SET content = json, updated_at = now()
    alt Database write succeeds
        DB-->>Service: 200 OK (Updated DocumentRecord)
        Service-->>User: Status: "Saved"
    else Network / Permission Failure
        DB-->>Service: Error / 403 Forbidden
        Service-->>User: Status: "Save failed (Retry)"
    end
```

### Race Condition Protection
If a user continues typing while an asynchronous save is in-flight:
1. `isSavingRef` blocks concurrent save dispatches.
2. `hasPendingSaveRef` flags that newer keystrokes exist.
3. Upon completion of the in-flight write, the latest state is automatically dispatched immediately.

---

## 5. Document Sharing & Authorization Flow

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Document Owner (Alice)
    participant UI as Share Dialog
    participant Sharing as SharingService
    participant DB as Supabase PostgreSQL + RLS
    actor Recipient as Collaborator (Bob)

    Owner->>UI: Opens Share Dialog for Document
    Owner->>UI: Enters recipient email & role ("editor")
    UI->>Sharing: shareDocument(docId, email, role)
    
    Sharing->>DB: Query profiles WHERE email = recipientEmail
    alt Recipient exists
        DB-->>Sharing: Return recipient user ID
        Sharing->>DB: INSERT INTO document_shares (document_id, shared_with_user_id, permission)
        Note over DB: RLS verifies: auth.uid() = document.owner_id
        DB-->>Sharing: Share record persisted
        Sharing-->>UI: Share created successfully
    else Recipient not found
        Sharing-->>UI: Error: "No registered user found with this email"
    end

    Recipient->>DB: Query documents (Dashboard load)
    Note over DB: RLS filters: owner_id = auth.uid() OR has_document_access(id)
    DB-->>Recipient: Returns shared document under "Shared With Me"
```

---

## 6. Security Architecture & RLS Safeguards

### Defense in Depth
1. **Frontend Protection**: Viewers are locked into read-only mode (`editable: false`), disabling formatting buttons and input handlers.
2. **Service Protection**: `documentService.updateDocument` explicitly verifies that callers possess `owner` or `editor` status before dispatching mutations.
3. **Database Security (Authoritative)**:
   - PostgreSQL Row Level Security (RLS) policies are active on `profiles`, `documents`, and `document_shares`.
   - Security Definer helper function `public.has_document_access(doc_id, required_permission)` isolates cross-table lookups, preventing infinite RLS recursion.
   - Unauthorized queries return empty sets or produce SQL permission errors.

---

## 7. Technical Tradeoffs & Scope Boundaries

1. **Structured JSONB vs. Raw HTML**:
   - *Choice*: JSONB.
   - *Tradeoff*: Requires parsing Markdown into ProseMirror schema nodes on import, but eliminates arbitrary script execution risks, guarantees lossless round-trip formatting, and enables easy future extension.
2. **Debounced Autosave vs. Live Operational Transformation (OT/CRDT)**:
   - *Choice*: Debounced autosave (800–1200ms) with concurrent write queuing.
   - *Tradeoff*: As explicitly required by the project brief, real-time simultaneous co-typing was excluded to ensure absolute stability, clean RLS verification, and zero third-party socket complexity.
3. **Dual-Mode Persistence (Live Supabase + LocalDB Simulator)**:
   - *Choice*: Unified service layer supporting both remote Supabase and an in-memory/localStorage engine.
   - *Benefit*: Ensures reviewers can immediately evaluate all 8 required scenarios out of the box without requiring manual environment configuration.
