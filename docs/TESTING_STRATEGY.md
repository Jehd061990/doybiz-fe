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

Authorization tests only verify frontend visibility helpers. Backend endpoints remain responsible for security and tenant validation.

## Commands

- `npm test`: run the full test suite once.
- `npm run test:watch`: rerun tests interactively while editing.

Future integration tests may use a controlled backend/API test server. They should not call production services or duplicate backend authorization/business-rule tests.
