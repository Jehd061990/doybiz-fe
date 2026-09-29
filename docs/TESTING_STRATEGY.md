# Testing Strategy

## Stack

- Jest 30.5.2 runs tests in-band by default.
- `next/jest` configures Next transforms and module handling.
- React Testing Library 16.3.3 and `@testing-library/jest-dom` provide user-behavior assertions.
- Tests use the jsdom environment and the `@/*` source alias.

## Test Placement and Scope

Tests live next to the related unit/component under `src` and use `*.test.ts` or `*.test.tsx`. Tests assert observable behavior: submitted login credentials and visible errors, role recognition, module permissions, branch visibility helpers, and API URL routing. They do not couple to internal state implementation.

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
- Owner-only Users navigation and existing Phase 7B login/session/logout/protected-route behavior.
- Session-sourced organization ID display without invented profile fields.
- Branch list loading/empty/error/filter/status behavior and role-scoped returned data.
- Branch creation validation, exact model-field payload, initial status, owner-only UX, safe error handling, and success feedback.
- Provider contract checks that branch detail/update and organization endpoints remain unsupported.
- Billing overview renders estimate/subscription fields from backend responses, including loading/empty/error states.
- Billing detail preserves backend payment totals/history, makes paid records read-only, and handles Xendit initiation without marking records paid.
- Prepaid adjustments submit selected IDs only, require acknowledgement of backend pending-state effects, and preserve owner-only authorization.
- Initial prepaid subscription activation uses an allowed term and opens the returned setup invoice.

Authorization tests only verify frontend visibility helpers. Backend endpoints remain responsible for security and tenant validation.

## User Management Test Boundaries

User list and branch queries use mocked Refine hooks to assert visible states and behavior without an API server. Form tests verify submitted request values; data-provider tests separately verify the exact HTTP method/path/body and unwrap behavior. Mock data uses sanitized backend response fields only. No test calls a production service or supplies real credentials.

Preset preview tests are tied to the current backend `rolePermissions` mapping. The backend remains authoritative for create defaults and `applyPreset`; UI tests verify that editing a preset does not submit replacement permissions unless the explicit apply action is selected.

Branch list/page tests mock the shared `useBranches()` hook; provider tests separately check its Refine resource maps to the bare-array `GET /api/branches` contract. Branch creation tests assert only `name`, `address`, `contactNumber`, and `status` are submitted, with no browser-provided organization ID. No test invents or calls a branch edit/delete or organization profile endpoint.

Billing tests mock Refine's existing resource/custom hooks. They assert seat values are rendered from backend estimate payloads rather than calculated, payment/adjustment actions use inspected URLs and payloads, paid records have no payment action, payment initiation remains pending, and only returned HTTPS Xendit action URLs are followed. No tests call Xendit or the webhook.

## Commands

- `npm run test` (or `npm test`): run the full test suite once.
- `npm run test:watch`: rerun tests interactively while editing.

Future integration tests may use a controlled backend/API test server. They should not call production services or duplicate backend authorization/business-rule tests.
