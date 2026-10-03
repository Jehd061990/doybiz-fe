# Testing Strategy

## Stack

- Jest 30.5.2 runs tests in-band by default.
- `next/jest` configures Next transforms and module handling.
- React Testing Library 16.3.3 and `@testing-library/jest-dom` provide user-behavior assertions.
- Tests use the jsdom environment and the `@/*` source alias.

## Test Placement and Scope

Tests live next to the related unit/component under `src` and use `*.test.ts` or `*.test.tsx`. Tests assert observable behavior: submitted login credentials and visible errors, role recognition, module permissions, branch visibility helpers, API URL routing, and CMS actions. They do not couple to internal state implementation.

The current tests cover:

- Login form submission and a visible rejected-login error.
- Recognition of `OWNER`, `MANAGER`, and `CASHIER` without accepting `SUPER_ADMIN`.
- Independent module and branch access decisions and active status.
- Same-origin API URL construction for the backend proxy and auth session routes.
- User/branch Refine data-provider mapping against the inspected endpoints and response shapes.
- User list loading, empty, error, owner-only, filtering, and rendered identity/access data.
- Create/edit payloads for roles, branches, module permissions, presets, and status.
- Preset preview, explicit `applyPreset`, custom-module preservation, validation, and owner-wide branch access.
- Safe user-management error messages, including backend last-active-owner protection.
- Owner-only Users navigation and existing login/session/logout/protected-route behavior.
- Session-sourced organization ID display without invented profile fields.
- Branch list loading/empty/error/filter/status behavior and role-scoped returned data.
- Branch creation validation, exact model-field payload, initial status, owner-only UX, safe error handling, and success feedback.
- Provider contract checks that branch detail/update and organization endpoints remain unsupported.
- Billing overview/detail/adjustment/activation behavior against the inspected backend contracts.
- The module registry's exact backend module identifiers and implemented routes.
- App navigation filtering by effective module permission.
- The server-side module route guard allow/deny/redirect behavior.
- POS route/navigation access, service-catalog permission behavior, branch selection, cart/sale/payment payloads, and failure-state retention.
- Website CMS rendering, draft field editing, Save Draft request behavior, Publish request behavior, loading/error states, and the distinction between draft and published workflow at the UI boundary.

Authorization tests only verify frontend visibility helpers. Backend endpoints remain responsible for security and tenant validation.

## Website CMS Test Boundaries

Website tests mock Refine custom query/mutation hooks; they never call a production backend. The component test asserts user-visible behavior and exact custom action contracts:

- `GET /website` is represented by the custom query.
- Save Draft submits the current complete `WebsiteValue` to `PUT /website`.
- Publish invokes `POST /website/publish` and does not send editable draft fields as a publish payload.
- Field edits remain local until Save Draft is selected.
- Query errors and mutation errors are surfaced through accessible status/alert text.
- Loading state does not render an incomplete editor.
- The Preview Website link remains available independently of Save/Publish actions.

The frontend does not test backend normalization, tenant isolation, or publication persistence. Those behaviors belong to the backend Phase 7 empirical test.

## Commands

- `npm run test` (or `npm test`): run the full test suite once.
- `npm run test:watch`: rerun tests interactively while editing.
- `npm run typecheck`: validate TypeScript.
- `npm run build`: validate the production Next.js build.

Future integration tests may use a controlled backend/API test server. They should not call production services or duplicate backend authorization/business-rule tests.
