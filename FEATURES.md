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

| ID      | Behavior                                                                                                      | Verification Command                                 | State         | Evidence (Commit / Evaluator Verdict)                       |
| ------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------- | ----------------------------------------------------------- |
| **F00** | Bootstrap the development, database, quality, testing, and container foundation for the application.          | `pnpm verify`                                        | `passing`     | `de12250608b3210ec4b4506bfb6176a1360a2eab / Evaluator PASS` |
| **F01** | Create and store a **Company** independently with general notes.                                              | `pnpm test src/services/company.test.ts`             | `passing`     | `22c535fd8ebd5cbcaf64d91ef65b8aab641d923f / Evaluator PASS` |
| **F02** | Create a **Job Application** manually, linked to a company, with position, date, and status.                  | `pnpm test:e2e tests/e2e/create-application.spec.ts` | `passing`     | `cd0333b99f212f10771fefdd7fb6460eb1316387 / Evaluator PASS` |
| **F03** | Display a default **List View** of all active job applications.                                               | `pnpm test:e2e tests/list-view.spec.ts`              | `passing`     | `3dae583b4ae05a52684934f0368fca9e0b952b25 / Evaluator PASS` |
| **F04** | **Search** job applications by company name or position title.                                                | `pnpm test:e2e tests/search.spec.ts`                 | `passing`     | `60a739174effc0f8e5745abce8faf651c15876af / Evaluator PASS` |
| **F05** | **Filter** the application list between Active and Closed statuses.                                           | `pnpm test:e2e tests/filters.spec.ts`                | `passing`     | `d7a40faab134fd82bcadde2348961785d2842aeb / Evaluator PASS` |
| **F06** | Update **Application Status** through all fixed states (Applied, Interviewing, Offer, Accepted, etc.).        | `pnpm test:e2e tests/status-transitions.spec.ts`     | `passing`     | `efae1d6fece1825788c31f127245019beab073c2 / Evaluator PASS` |
| **F07** | Manage individual **Interview Records** with states (Scheduled, Completed, Cancelled).                        | `pnpm test src/services/interview.test.ts`           | `passing`     | `5271688650be136fd68a4e973b39776ee2403130 / Evaluator PASS` |
| **F08** | Automatically record **Activity History** for creation, status changes, and interviews.                       | `pnpm test src/services/history.test.ts`             | `passing`     | `704e8c96f23c3662d35258b024dc882916137f17 / Evaluator PASS` |
| **F09** | View a chronological **Company History** of all previous applications for a specific company.                 | `pnpm test:e2e tests/company-history.spec.ts`        | `passing`     | `b8ce1d17f760eeddf04a02423af980d9f72ee0c4 / Evaluator PASS` |
| **F10** | Ensure status transitions and history logging occur within a single **Database Transaction**.                 | `pnpm test src/services/application.test.ts`         | `passing`     | `f5159c184d92445af1d89edba99ba8a05618d5a9 / Evaluator PASS` |
| **F11** | Enforce **Server-Side Validation** via Zod for all application and company data entries.                      | `pnpm test src/services`                             | `evaluating`  |                                                             |
| **F12** | Render all Markdown-based job descriptions and notes safely.                                                  | `pnpm test:e2e tests/e2e/markdown-rendering.spec.ts` | `not_started` |                                                             |
| **F13** | Refine Active and Closed application views with an accessible **Exact Status Filter** and default All option. | `pnpm test:e2e tests/e2e/filters.spec.ts`            | `not_started` |                                                             |

## State Transitions

- Orchestrator: `not_started -> active`.
- Orchestrator after Generator commit: `active -> evaluating`.
- Orchestrator after Evaluator `PASS`: `evaluating -> passing`.
- Orchestrator after Evaluator `FAIL`: `evaluating -> active`.
- Orchestrator on an external blocker: `active | evaluating -> blocked`.

`Evidence` must contain the verified commit hash and Evaluator verdict.
