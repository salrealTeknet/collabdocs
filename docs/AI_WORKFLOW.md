# CollabDocs — AI-Assisted Engineering Workflow & Methodology

> **Ajaia LLC — AI-Native Full Stack Developer Assessment**  
> **Candidate:** Abduljawwad Salihu  
> **Evaluation Phase:** Engineering Process & AI Collaboration Transparency  

---

## 1. Overview of AI Tools Utilized

During the development of CollabDocs, AI technology (Google Gemini 3.8 / AI Studio Developer Environment) was utilized as an engineering force multiplier across architectural design, schema drafting, test automation, and code synthesis.

Rather than relying on unguided code generation, an **architect-driven, verification-first development approach** was strictly followed:
1. **Requirements Deconstruction**: Every constraint in the Ajaia LLC assessment specification was mapped into formal interfaces and acceptance criteria before writing code.
2. **Deterministic Architecture First**: Database normalization, RLS policies, and service contracts were defined prior to component scaffolding.
3. **Automated Verification**: Vitest unit & integration tests were authored and executed to prove correctness at every iteration.

---

## 2. Architectural Design & Planning Assistance

AI was employed during the initial phase to explore structural options for:
- **Tiptap Schema Representation**: Analyzing the tradeoff between raw HTML string persistence and ProseMirror JSON syntax trees. AI analysis confirmed that storing structured JSONB in PostgreSQL protects against cross-site scripting (XSS), eliminates HTML sanitization vulnerabilities, and preserves node attributes losslessly across re-opening.
- **RLS Recursion Elimination**: AI helped draft PostgreSQL `SECURITY DEFINER` helper functions (`is_document_owner` and `has_document_access`) to avoid infinite recursion when querying documents and document_shares simultaneously.

---

## 3. Code Implementation Acceleration

AI accelerated standard boilerplate generation across several key layers:
- **Tiptap Extension Configuration**: Rapidly generating the toolbar binding definitions, keyboard shortcuts (`Ctrl+B`, `Ctrl+I`, `Ctrl+U`, `Ctrl+S`), and active state queries (`editor.isActive(...)`).
- **Markdown AST Tokenizer**: Rapidly producing the line-by-line parsing state machine in `fileImportService.ts` that transforms `# Headings`, `**bold**`, `*italic*`, and `- lists` into valid Tiptap JSON node structures.
- **Tailwind Component Scaffolding**: Accelerating clean, accessible modal dialogs, responsive cards, and responsive navigation headers conforming to modern SaaS design standards.

---

## 4. Debugging & Testing: Real Examples of AI Code Reviewed & Corrected

A cornerstone of Senior AI-Native software engineering is critically reviewing and refactoring AI output rather than accepting it blindly. Key examples during this project include:

### Example 1: LocalDB Test Environment In-Memory Fallback
- *Initial Code*: The initial local database simulator relied exclusively on `window.localStorage` with a blanket `if (typeof window === 'undefined') return defaultValue;`.
- *Issue Identified*: When running automated tests in Vitest (which executes inside a Node.js process without a browser DOM), user session switches and share mutations were ignored because `window` was undefined.
- *Correction Applied*: Refactored `LocalDatabase` to maintain an internal `memoryStore: Record<string, any>` dictionary and deep copy mechanisms when running in Node.js environments. This immediately caused all 13 Vitest tests to pass green.

### Example 2: Non-Owner Document Renaming Restriction
- *Initial Code*: An early draft allowed editors to rename documents as long as they had write permissions.
- *Issue Identified*: The assessment specification explicitly mandates: *"Shared users must not be allowed to rename documents unless their permissions explicitly permit it"* and *"Viewer: Can open and read the document but cannot edit or rename it. Editor: Can view and modify document content but cannot delete the document or change ownership."*
- *Correction Applied*: Restricted document renaming exclusively to the document owner (`permission === 'owner'`) in both the frontend header, the dashboard actions menu, and the `documentService.updateDocument` backend validation logic.

### Example 3: RLS Ownership Preservation During Updates
- *Initial Code*: An initial SQL draft had an update policy that allowed editors to modify documents without validating `owner_id`.
- *Issue Identified*: Malicious editors could theoretically re-assign the `owner_id` column to themselves during a payload update.
- *Correction Applied*: Added `WITH CHECK (owner_id = (SELECT d.owner_id FROM public.documents d WHERE d.id = documents.id))` to ensure that document ownership can never be forged or transferred during content updates.

---

## 5. Security & Correctness Verification Methodology

All code produced with AI assistance underwent three levels of verification:
1. **Static Analysis & Type Checking**: Executed `npm run lint` (`tsc --noEmit`) to verify strict TypeScript adherence, interface conformance, and import safety.
2. **Automated Unit & Integration Testing**: Authored 13 automated tests in `tests/collabdocs.test.ts` executing via `npm test` (Vitest), verifying:
   - Document creation and validation rules.
   - Structured JSON persistence and re-opening.
   - File import size limits, extension validation, and AST transformation.
   - Document sharing, role changes, and revocation.
   - Viewer vs. Editor restrictions.
   - Unauthorized access blocking.
3. **End-to-End Manual Scenario Testing**: Tested all 8 mandatory acceptance scenarios (Registration, Document Creation, Formatting, Renaming, File Import, Sharing, Unauthorized Access, and Browser Refresh) across multiple identities (Alice, Bob, Charlie).

---

## 6. Summary of AI Effectiveness

Utilizing AI within an architect-led workflow enabled the delivery of a production-quality, tested, secure MVP with complete documentation and zero functional shortcuts in a fraction of the time traditionally required, while preserving strict engineering rigor and architectural standards.
