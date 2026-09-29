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

Authorization tests only verify frontend visibility helpers. Backend endpoints remain responsible for security and tenant validation.

## User Management Test Boundaries

User list and branch queries use mocked Refine hooks to assert visible states and behavior without an API server. Form tests verify submitted request values; data-provider tests separately verify the exact HTTP method/path/body and unwrap behavior. Mock data uses sanitized backend response fields only. No test calls a production service or supplies real credentials.

Preset preview tests are tied to the current backend `rolePermissions` mapping. The backend remains authoritative for create defaults and `applyPreset`; UI tests verify that editing a preset does not submit replacement permissions unless the explicit apply action is selected.

## Commands

- `npm run test` (or `npm test`): run the full test suite once.
- `npm run test:watch`: rerun tests interactively while editing.

Future integration tests may use a controlled backend/API test server. They should not call production services or duplicate backend authorization/business-rule tests.
