# PROGRESS.md

## Usage Instructions for Agents

- **Clock-in**: Read this file immediately at the start of every session.
- **Ownership**: Only the Orchestrator changes orchestration state or sprint scope.
- **WIP=1**: Only one feature may be `active` or `evaluating`.
- **Reports**: The Orchestrator records Generator and Evaluator reports here.
- **Clock-out**: Update the handoff before ending or resetting a session.

## Orchestration State

- **Phase**: `implementation`
- **Active Feature**: `F15`
- **Generator Commit**: `pending`
- **Evaluator Verdict**: `pending`

## Active Sprint Contract

- **Feature ID**: `F15`
- **Scope**: Add a job-posting URL input and adjacent import button at the top of the existing `Add an application` form. A server-side endpoint fetches a public HTTP(S) posting and deterministically extracts the company name, position title, and job description without AI, preferring schema.org `JobPosting` JSON-LD and using page metadata or focused HTML heuristics only when structured fields are absent. A successful import replaces the current company selection/name, position title, description, and complete reference-link list; missing extracted values clear their corresponding fields, and the submitted source URL becomes the first and only reference link. Preserve user-owned applied date, status, and application notes because they are not posting facts. Match an extracted company to an existing company case-insensitively; otherwise select new-company mode with the extracted name, or leave company empty when unavailable. Preserve manual application creation and all F01–F14 behavior. Do not use AI services/packages, add database fields, persist fetched content before submission, bypass inaccessible/authenticated pages, execute page scripts, or add site-specific scrapers.
- **Acceptance Criteria**:
  1. The first form control is an accessible HTTP(S) job-posting URL input with an adjacent `Import details` button. Invalid or empty input is rejected without a request; pending state prevents duplicate imports; the control reports success and actionable validation, fetch, unsupported-content, timeout, and extraction failures without submitting the application.
  2. A validated uncached Route Handler delegates to a server-only extraction service. The service accepts only public HTTP(S) destinations, rejects credentials, localhost, private/reserved/link-local/multicast IP destinations for every DNS result and redirect hop, limits redirects, download size, and duration, and accepts HTML content only. Failures use the established structured API envelope without leaking network internals.
  3. Extraction does not use AI or execute remote scripts. It prefers valid schema.org `JobPosting` JSON-LD, including graph/array forms, for title, hiring organization name, and description; absent fields may fall back to standard Open Graph/meta fields and focused semantic HTML. HTML descriptions are converted to readable plain text or Markdown-safe text, normalized, and bounded before returning.
  4. On success, the source URL becomes the sole reference link and the imported company, position title, and description replace current values. Missing values clear stale values. An existing company is selected by case-insensitive exact name; otherwise new-company mode is populated, and an unavailable company leaves the company choice empty. Applied date, status, and application notes remain unchanged.
  5. Importing never creates or updates database records. The user can review and manually edit every populated field before normal submission, and the existing server-validated application creation flow stores the imported source and edited values without contract changes.
  6. Route Handler, extraction-service, form component, and Playwright tests cover JSON-LD priority and variants, metadata/HTML fallback, entity/text normalization, partial/no extractable data, invalid URLs, non-HTML and oversized responses, timeout/network errors, redirect and SSRF defenses, replacement of dirty form state, existing/new/missing company handling, duplicate-click prevention, edit-before-submit, accessibility, and the retained source reference. Formatting, strict TypeScript, lint, full Vitest, full Playwright, and production build pass with no unrelated changes or `any`.
- **Relevant Constraints**: `Read the Next.js 16.3.0 Route Handlers and Server/Client Components guides in node_modules/next/dist/docs before code changes; Client Form -> uncached Route Handler -> server-only Extraction Service; Zod validation at route and service boundaries; standardized API errors; no database access in extraction; public HTTP(S) only with DNS-aware SSRF checks repeated across bounded manual redirects; bounded timeout/body/redirect count and HTML-only content; deterministic schema.org-first parsing without AI, browser automation, script execution, or site-specific rules; reuse existing form, company query data, referenceLinks field, and normal application creation endpoint; preserve user-owned date/status/notes; strict TypeScript; no any; pragmatic DRY; prefer existing platform/parser capabilities and add no runtime dependency unless unavoidable and explicitly reported; one logical Generator commit; Generator must not edit FEATURES.md, PROGRESS.md, or DECISIONS.md.`
- **Expected Files or Layers**: `new src/app/api/job-posting-extraction/route.ts and route.test.ts; new server-only extraction service and focused tests under src/services and/or src/server; src/components/create-application-form.tsx and tests; tests/e2e/job-posting-import.spec.ts; narrowly shared response/type helpers if needed. No schema, migration, database-query, application-service, company-service, or unrelated UI changes.`
- **Targeted Verification**: `pnpm test src/app/api/job-posting-extraction/route.test.ts src/services/job-posting-extraction.test.ts src/components/create-application-form.test.tsx; pnpm test:e2e tests/e2e/job-posting-import.spec.ts; pnpm format:check; pnpm lint; pnpm typecheck; git diff --check.`
- **Final Verification**: `pnpm lint && pnpm test && pnpm test:e2e && pnpm build`

## Generator Report

- **Commit**: `pending`
- **Changed Files**: `pending`
- **Tests Run**: `pending`
- **Known Risks**: `pending`

## Evaluator Report

- **Verdict**: `pending`
- **Commit Verified**: `pending`
- **Checks Run**: `pending`
- **Findings**: `pending`
- **Required Fix**: `pending`

## Current Status

- **Active**: `F15 — import job-posting details from a public link without AI`
- **Queued**: `none`
- **Completed**: `F00 — project foundation bootstrap (de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS); F01 — company creation and persistence (22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS); F02 — manual job-application creation (cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS); F03 — default active-application list view (3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS); F04 — search active applications by company name or position title (60a739174effc0f8e5745abce8faf651c15876af / Evaluator PASS); F05 — filter between Active and Closed statuses (d7a40faab134fd82bcadde2348961785d2842aeb / Evaluator PASS); F06 — update application status through all fixed states (efae1d6fece1825788c31f127245019beab073c2 / Evaluator PASS); F07 — manage individual interview records (5271688650be136fd68a4e973b39776ee2403130 / Evaluator PASS); F08 — complete and expose application-scoped activity history (704e8c96f23c3662d35258b024dc882916137f17 / Evaluator PASS); F09 — company-scoped chronological application history (b8ce1d17f760eeddf04a02423af980d9f72ee0c4 / Evaluator PASS); F10 — transactional status/history updates (f5159c184d92445af1d89edba99ba8a05618d5a9 / Evaluator PASS); F11 — server-side Zod validation evidence (d089a8efced85c944f93a54d50a58c2e62293d38 / Evaluator PASS); F12 — safe Markdown rendering (3d89edab9b3d006e593fc08de433060f7ba334da / Evaluator PASS); F13 — exact-status button-group filtering (7fcfc4220be3ac454354d11e69c0fa7ccf8512d0 / Evaluator PASS); F14 — dedicated company management and ownership-tree deletion (6f3aaf4d060b3cdb4640650d1e06391a77ef6153 / Evaluator PASS)`
- **Blocked**: `none`

## Current Session Summary

F00 through F14 are passing. F15 is active with a bounded contract for deterministic, server-side job-posting extraction and safe replacement of extractable form fields.

## Next Step

1. `Generator implements the active F15 sprint contract and produces one logical commit.`

## Verification Status

- **Build**: `PASS at 6f3aaf4d060b3cdb4640650d1e06391a77ef6153`
- **Lint**: `PASS at 6f3aaf4d060b3cdb4640650d1e06391a77ef6153`
- **Unit/Integration**: `PASS (175/175) at 6f3aaf4d060b3cdb4640650d1e06391a77ef6153`
- **E2E**: `PASS (12/12) at 6f3aaf4d060b3cdb4640650d1e06391a77ef6153`

## Current Session Handoff Report

- **Decisions Made**: `F15 uses deterministic server-side extraction with schema.org JobPosting priority, generic fallbacks, and bounded public-network fetching. Successful imports replace extractable fields and references while preserving user-owned application metadata.`
- **Context Summary**: `F00 through F14 are passing. F15 is active; its sprint contract, feature state, and durable extraction decision are recorded.`
- **Remaining Blockers**: `none`
- **Next Owner**: `Generator implements F15 and reports one logical commit.`
