# FEATURES.md

This file serves as the machine-readable scope surface for the project. Each feature must satisfy its verification command to transition to the `passing` state.

Only the Orchestrator may change `State` or `Evidence`.

## Allowed States

- `not_started`
- `active`
- `evaluating`
- `blocked`
- `passing`

Exactly one feature may be `active` or `evaluating`.

## Core Product Features

| ID      | Behavior                                                                                               | Verification Command                             | State         | Evidence (Commit / Evaluator Verdict)                       |
| ------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------- | ----------------------------------------------------------- |
| **F00** | Bootstrap the development, database, quality, testing, and container foundation for the application.   | `pnpm verify`                                    | `passing`     | `de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS` |
| **F01** | Create and store a **Company** independently with general notes.                                       | `pnpm test src/services/company.test.ts`         | `passing`     | `22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS` |
| **F02** | Create a **Job Application** manually, linked to a company, with position, date, and status.           | `pnpm test:e2e tests/create-application.spec.ts` | `evaluating`  | —                                                           |
| **F03** | Display a default **List View** of all active job applications.                                        | `pnpm test:e2e tests/list-view.spec.ts`          | `not_started` | —                                                           |
| **F04** | **Search** job applications by company name or position title.                                         | `pnpm test:e2e tests/search.spec.ts`             | `not_started` | —                                                           |
| **F05** | **Filter** the application list between Active and Closed statuses.                                    | `pnpm test:e2e tests/filters.spec.ts`            | `not_started` | —                                                           |
| **F06** | Update **Application Status** through all fixed states (Applied, Interviewing, Offer, Accepted, etc.). | `pnpm test:e2e tests/status-transitions.spec.ts` | `not_started` | —                                                           |
| **F07** | Manage individual **Interview Records** with states (Scheduled, Completed, Cancelled).                 | `pnpm test src/services/interview.test.ts`       | `not_started` | —                                                           |
| **F08** | Automatically record **Activity History** for creation, status changes, and interviews.                | `pnpm test src/services/history.test.ts`         | `not_started` | —                                                           |
| **F09** | View a chronological **Company History** of all previous applications for a specific company.          | `pnpm test:e2e tests/company-history.spec.ts`    | `not_started` | —                                                           |

## Feature Constraints & Logic

- **F10**: Ensure status transitions and history logging occur within a single **database transaction**.
- **F11**: Enforce **server-side validation** via Zod for all application and company data entries.
- **F12**: Render all Markdown-based job descriptions and notes safely.

## State Transitions

- Orchestrator: `not_started -> active`.
- Orchestrator after Generator commit: `active -> evaluating`.
- Orchestrator after Evaluator `PASS`: `evaluating -> passing`.
- Orchestrator after Evaluator `FAIL`: `evaluating -> active`.
- Orchestrator on an external blocker: `active | evaluating -> blocked`.

`Evidence` must contain the verified commit hash and Evaluator verdict.
